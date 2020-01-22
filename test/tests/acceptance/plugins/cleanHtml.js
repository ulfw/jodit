describe('Clean html plugin', function() {
	describe('Click remove format button', function() {
		describe('For range selection', function() {
			it('Should clear selected HTML fragment', function() {
				const editor = new Jodit(appendTestArea());

				const button = editor.container.querySelector(
					'.jodit_toolbar_btn.jodit_toolbar_btn-eraser'
				);
				expect(button).is.not.null;

				[
					[
						'start <span style="background-color: red; color: blue;">test test test</span> elm',
						'span',
						'start test test test elm'
					],
					[
						'start <strong style="background-color: red; color: blue;">test test test</strong> elm',
						'strong',
						'start test test test elm'
					],
					[
						'start <strong style="background-color: red; color: blue;">test test test</strong> elm',
						function(range) {
							const elm = editor.editor.querySelector('strong');
							range.setStart(elm.firstChild, 5);
							range.setEnd(elm.firstChild, 9);
						},
						'start <strong style="background-color: red; color: blue;">test </strong>test<strong style="background-color: red; color: blue;"> test</strong> elm'
					],
					[
						'<p>start <strong style="background-color: red; color: blue;"><span style="align-content: baseline;">test test te</span>st</strong> elm</p>',
						function(range) {
							const elm = editor.editor.querySelector('span');
							range.setStart(elm.firstChild, 5);
							range.setEnd(elm.firstChild, 9);
						},
						'<p>start ' +
						'<span style="align-content: baseline;"><strong><span style="background-color: red;">test </span></strong></span>' +
						'<span style="align-content: baseline;"><strong><span style="background-color: red;"> te</span></strong></span>' +
						'test<strong><span style="background-color: red;">st</span></strong> elm</p>'
					]
				].forEach(function(test) {
					editor.value = test[0];

					const range = editor.selection.createRange();

					if (typeof test[1] === 'string') {
						range.setStartBefore(
							editor.editor.querySelector(test[1])
						);
						range.setEndAfter(editor.editor.querySelector(test[1]));
					} else {
						test[1](range);
					}

					editor.selection.selectRange(range);

					simulateEvent('mousedown', 0, button);

					expect(test[2]).equals(editor.value);
				});
			});
		});

		describe('For collapsed selection', function() {
			it('Should move cursor outside from styled element', function() {
				const editor = new Jodit(appendTestArea());

				[
					[
						'start <span style="background-color: red; color: blue;">test test test</span>',
						'span',
						'start <span style="background-color: red; color: blue;">test test test</span> pop '
					],

					[
						'start <strong>test test test</strong>',
						'strong',
						'start <strong>test test test</strong> pop '
					],

					[
						'start <strong><em>test test test</em></strong>',
						'em',
						'start <strong><em>test test test</em></strong> pop '
					]
				].forEach(function(test) {
					editor.value = test[0];

					const range = editor.selection.createRange();
					range.selectNodeContents(
						editor.editor.querySelector(test[1])
					);
					range.collapse(false);

					editor.selection.selectRange(range);

					const button = editor.container.querySelector(
						'.jodit_toolbar_btn.jodit_toolbar_btn-eraser'
					);

					simulateEvent('mousedown', 0, button);

					editor.selection.insertHTML(' pop ');

					expect(test[2]).equals(editor.value);
				});
			});
		});
	});

	describe('Replace old tags', function() {
		it('Should replace old tags to new', function() {
			const editor = new Jodit(appendTestArea(), {
				cleanHTML: {
					timeout: 0
				}
			});
			editor.value = 'test <b>old</b> test';
			const range = editor.selection.createRange();
			range.setStart(editor.editor.querySelector('b').firstChild, 2);
			range.collapse(true);
			editor.selection.selectRange(range);

			simulateEvent('mousedown', 0, editor.editor);

			editor.selection.insertHTML(' some ');

			expect(editor.value).equals('test <strong>ol some d</strong> test');
		});

		describe('Replace custom tags', function() {
			it('Should replace tags', function() {
				const editor = new Jodit(appendTestArea(), {
					cleanHTML: {
						replaceOldTags: {
							p: 'div'
						},
						timeout: 0
					}
				});
				editor.value = '<p>test <b>old</b> test</p>';
				const range = editor.selection.createRange();
				range.setStart(editor.editor.querySelector('b').firstChild, 2);
				range.collapse(true);
				editor.selection.selectRange(range);

				simulateEvent('mousedown', 0, editor.editor);

				editor.selection.insertHTML(' some ');

				expect(editor.value).equals(
					'<div>test <strong>ol some d</strong> test</div>'
				);
			});
		});

		describe('Disable', function() {
			it('Should not replace old tags to new', function() {
				const editor = new Jodit(appendTestArea(), {
					cleanHTML: {
						replaceOldTags: false,
						timeout: 0
					}
				});
				editor.value = 'test <b>old</b> test';
				const range = editor.selection.createRange();
				range.setStart(editor.editor.querySelector('b').firstChild, 2);
				range.collapse(true);
				editor.selection.selectRange(range);

				simulateEvent('mousedown', 0, editor.editor);

				editor.selection.insertHTML(' some ');

				expect(editor.value).equals('test <b>ol some d</b> test');
			});
		});
	});

	describe('Deny tags', function() {
		describe('Parameter like string', function() {
			it('Should remove all tags in denyTags options', function() {
				const editor = new Jodit(appendTestArea(), {
					cleanHTML: {
						denyTags: 'p'
					}
				});
				editor.value = '<p>te<strong>stop</strong>st</p><h1>pop</h1>';
				expect(editor.value).equals('<h1>pop</h1>');
			});
		});
	});

	describe('Allow tags', function() {
		describe('Parameter like string', function() {
			it('Should remove all tags not in allowTags options', function() {
				const editor = new Jodit(appendTestArea(), {
					cleanHTML: {
						allowTags: 'p'
					}
				});
				editor.value = '<p>te<strong>stop</strong>st</p><h1>pop</h1>';
				expect(editor.value).equals('<p>test</p>');
			});
		});

		describe('Parameter like hash', function() {
			it('Should remove all tags not in allowTags options', function() {
				const editor = new Jodit(appendTestArea(), {
					cleanHTML: {
						allowTags: {
							p: true
						}
					}
				});
				editor.value = '<p>te<strong>stop</strong>st</p><h1>pop</h1>';
				expect(editor.value).equals('<p>test</p>');
			});
		});

		describe('Allow attributes', function() {
			it('Should remove all attributes from element and remove not in allowTags options', function() {
				const editor = new Jodit(appendTestArea(), {
					cleanHTML: {
						allowTags: {
							p: {
								style: true
							}
						}
					}
				});
				editor.value =
					'<p style="color: red;" data-id="111">te<strong>stop</strong>st</p><h1>pop</h1>';
				expect(editor.value).equals('<p style="color: red;">test</p>');
			});
		});

		describe('Time checking', function() {
			it('Should work fast', function() {
				const editor = new Jodit(appendTestArea(), {
					cleanHTML: {
						allowTags: {
							p: {
								style: true
							}
						}
					}
				});
				editor.value = '<p style="color: red;" data-id="111">te<strong>stop</strong>st</p><h1>pop</h1>'.repeat(
					500
				);
				expect(editor.value).equals(
					'<p style="color: red;">test</p>'.repeat(500)
				);
			}).timeout(1500);
		});
	});

	describe('Fullfill empty paragraph', function() {
		it('Should fill in empty paragraph', function() {
			const editor = new Jodit(appendTestArea(), {
				cleanHTML: {
					fillEmptyParagraph: true
				}
			});
			editor.value = '<p></p><p></p><div></div>';
			expect(editor.value).equals(
				'<p><br></p><p><br></p><div><br></div>'
			);
		});

		describe('Switch off fillEmptyParagraph option', function() {
			it('Should not fill in empty paragraph', function() {
				const editor = new Jodit(appendTestArea(), {
					cleanHTML: {
						fillEmptyParagraph: false
					}
				});
				editor.value = '<p></p><p></p><div></div>';
				expect(editor.value).equals('<p></p><p></p><div></div>');
			});
		});
	});
});
