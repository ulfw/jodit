/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2020 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */

import * as consts from '../core/constants';
import { Dom } from '../core/dom';
import { $$, scrollIntoView } from '../core/helpers/';
import { HTMLTagNames, IJodit } from '../types';
import { Plugin } from '../core/plugin';
import { INVISIBLE_SPACE } from '../core/constants';

/**
 * Insert default paragraph
 *
 * @param {Jodit} editor
 * @param {Node} [fake]
 * @param {String} [wrapperTag]
 * @param {CSSStyleSheet} [style]
 * @return {HTMLElement}
 */
export const insertParagraph = (
	editor: IJodit,
	fake: Text | false,
	wrapperTag: HTMLTagNames,
	style?: CSSStyleDeclaration
): HTMLElement => {
	const p = editor.createInside.element(wrapperTag),
		helper_node = editor.createInside.element('br');

	p.appendChild(helper_node);

	if (style && style.cssText) {
		p.setAttribute('style', style.cssText);
	}

	editor.selection.insertNode(p, false, false);
	editor.selection.setCursorBefore(helper_node);

	const range = editor.selection.createRange();

	range.setStartBefore(wrapperTag.toLowerCase() !== 'br' ? helper_node : p);
	range.collapse(true);

	editor.selection.selectRange(range);

	Dom.safeRemove(fake);

	scrollIntoView(p, editor.editor, editor.editorDocument);

	editor.events?.fire('synchro'); // fire change

	return p;
};

/**
 * One of most important core plugins. It is responsible for all the browsers to have the same effect when the Enter
 * button is pressed. By default, it should insert the <p>
 */
export class enter extends Plugin {
	private brMode = false;
	private defaultTag: 'p' | 'br' | 'div' = consts.PARAGRAPH;

	afterInit(editor: IJodit): void {
		// use 'enter' option if no set
		this.defaultTag = editor.o.enter.toLowerCase() as 'p' | 'div' | 'br';
		this.brMode = this.defaultTag === consts.BR.toLowerCase();

		if (!editor.o.enterBlock) {
			editor.o.enterBlock = this.brMode
				? consts.PARAGRAPH
				: (this.defaultTag as 'p' | 'div');
		}

		editor.e
			.off('.enter')
			.on('change.enter', this.checkWrapper)
			.on('keydown.enter', (event: KeyboardEvent): false | void => {
				if (event.key === consts.KEY_ENTER) {
					/**
					 * Fired on processing `Enter` key. If return some value, plugin `enter` will do nothing.
					 * if return false - prevent default Enter behavior
					 *
					 * @event beforeEnter
					 */
					const beforeEnter = editor.e.fire('beforeEnter', event);

					if (beforeEnter !== undefined) {
						return beforeEnter;
					}

					if (!editor.selection.isCollapsed()) {
						editor.execCommand('Delete');
					}

					editor.selection.focus();

					this.onEnter(event);

					return false;
				}
			});
	}

	private checkWrapper = (): false | void => {
		if (!this.j.isEditorMode() || true) {
			return;
		}

		let current = this.j.selection.current(false) as Node;

		let currentBox = this.getBlockWrapper(current);

		if (!currentBox) {
			this.wrapText(current);
		}
	};

	private onEnter(event: KeyboardEvent): false | void {
		const editor = this.j,
			sel = editor.selection,
			defaultTag = this.defaultTag;

		let current = sel.current(false) as Node;

		if (!current || current === editor.editor) {
			current = editor.createInside.text(INVISIBLE_SPACE);
			sel.insertNode(current);
			sel.select(current);
		}

		let currentBox = this.getBlockWrapper(current);

		const isLi = Dom.isTag(currentBox, 'li');

		// if use <br> defaultTag for break line or when was entered SHIFt key or in <td> or <th> or <blockquote>
		if (!isLi && this.checkBR(current, event.shiftKey) === false) {
			return false;
		}

		// wrap no wrapped element
		if (!currentBox && !this.hasPreviousBlock(current)) {
			currentBox = this.wrapText(current);
		}

		if (!currentBox || currentBox === current) {
			insertParagraph(editor, false, isLi ? 'li' : defaultTag);
			return false;
		}

		if (this.checkUnsplittableBox(currentBox) === false) {
			return false;
		}

		if (isLi && Dom.isEmpty(currentBox)) {
			this.enterInsideEmptyLIelement(currentBox);
			return false;
		}

		const canSplit =
			currentBox.tagName.toLowerCase() === this.defaultTag || isLi;

		const cursorOnTheRight = sel.cursorOnTheRight(currentBox);
		const cursorOnTheLeft = sel.cursorOnTheLeft(currentBox);

		if (
			(!canSplit || Dom.isEmpty(currentBox)) &&
			(cursorOnTheRight || cursorOnTheLeft)
		) {
			let fake: Text | false = false;

			if (cursorOnTheRight) {
				fake = sel.setCursorAfter(currentBox);
			} else {
				fake = sel.setCursorBefore(currentBox);
			}

			insertParagraph(editor, fake, this.defaultTag);

			if (cursorOnTheLeft && !cursorOnTheRight) {
				sel.setCursorIn(currentBox, true);
			}

			return;
		}

		sel.splitSelection(currentBox);
	}

	private getBlockWrapper(
		current: Node | null,
		tagReg = consts.IS_BLOCK
	): HTMLElement | false {
		let node = current;
		const root = this.j.editor;

		do {
			if (!node || node === root) {
				break;
			}

			if (tagReg.test(node.nodeName)) {
				if (Dom.isTag(node, 'li')) {
					return node;
				}

				return (
					this.getBlockWrapper(node.parentNode, /^li$/i) ||
					(node as HTMLElement)
				);
			}

			node = node.parentNode;
		} while (node && node !== root);

		return false;
	}

	private checkBR(current: Node, shiftKeyPressed: boolean): void | false {
		// if use <br> defaultTag for break line or when was entered SHIFt key or in <td> or <th> or <blockquote>
		if (
			this.brMode ||
			shiftKeyPressed ||
			Dom.closest(current, ['pre','blockquote'], this.j.editor)
		) {
			const br = this.j.createInside.element('br');

			this.j.selection.insertNode(br, true);
			scrollIntoView(br, this.j.editor, this.j.editorDocument);

			return false;
		}
	}

	private wrapText(current: Node) {
		let needWrap: Node = current;

		Dom.up(
			needWrap,
			node => {
				if (node && node.hasChildNodes() && node !== this.j.editor) {
					needWrap = node;
				}
			},
			this.j.editor
		);

		const currentBox = Dom.wrapInline(needWrap, this.j.o.enter, this.j);

		if (Dom.isEmpty(currentBox)) {
			const helper_node = this.j.createInside.element('br');

			currentBox.appendChild(helper_node);
			this.j.selection.setCursorBefore(helper_node);
		}

		return currentBox;
	}

	private hasPreviousBlock(current: Node): boolean {
		const editor = this.j;

		return Boolean(
			Dom.prev(
				current,
				(elm: Node | null) =>
					Dom.isBlock(elm, editor.editorWindow) ||
					Dom.isImage(elm, editor.editorWindow),
				editor.editor
			)
		);
	}

	private checkUnsplittableBox(currentBox: HTMLElement): false | void {
		const editor = this.j,
			sel = editor.selection;

		if (!Dom.canSplitBlock(currentBox, editor.editorWindow)) {
			const br = editor.createInside.element('br');

			sel.insertNode(br, false);
			sel.setCursorAfter(br);

			return false;
		}
	}

	private enterInsideEmptyLIelement(currentBox: HTMLElement) {
		let fakeTextNode: Text | false = false;

		const ul: HTMLUListElement = Dom.closest(
			currentBox,
			['ol','ul'],
			this.j.editor
		) as HTMLUListElement;

		// If there is no LI element before
		if (
			!Dom.prev(
				currentBox,
				(elm: Node | null) => Dom.isTag(elm, 'li'),
				ul
			)
		) {
			fakeTextNode = this.j.selection.setCursorBefore(ul);
			// If there is no LI element after
		} else if (
			!Dom.next(
				currentBox,
				(elm: Node | null) => Dom.isTag(elm, 'li'),
				ul
			)
		) {
			fakeTextNode = this.j.selection.setCursorAfter(ul);
		} else {
			const leftRange = this.j.selection.createRange();
			leftRange.setStartBefore(ul);
			leftRange.setEndAfter(currentBox);
			const fragment = leftRange.extractContents();

			if (ul.parentNode) {
				ul.parentNode.insertBefore(fragment, ul);
			}

			fakeTextNode = this.j.selection.setCursorBefore(ul);
		}

		Dom.safeRemove(currentBox);

		insertParagraph(this.j, fakeTextNode, this.defaultTag);

		if (!$$('li', ul).length) {
			Dom.safeRemove(ul);
		}
	}

	beforeDestruct(editor: IJodit): void {
		editor.e.off('keydown.enter');
	}
}
