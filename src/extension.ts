// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// 1. 新建一轮对话 (New Turn)
	let newTurnCmd = vscode.commands.registerCommand('promptFlow.newTurn', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const separator = vscode.workspace.getConfiguration('promptFlow').get('separator', '\n\n---\n\n');

		// 获取文档末尾位置
		const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
		const endPos = lastLine.range.end;

		editor.edit(editBuilder => {
			// 在末尾插入分隔符
			editBuilder.insert(endPos, separator);
		}).then(success => {
			if (success) {
				// 移动光标到文件最末尾，并滚动视图，让用户聚焦于新区域
				const newEndPos = editor.document.lineAt(editor.document.lineCount - 1).range.end;
				editor.selection = new vscode.Selection(newEndPos, newEndPos);
				editor.revealRange(new vscode.Range(newEndPos, newEndPos));

				// (可选) 触发 VSCode 的折叠命令，把上面的折叠起来，让界面更清爽
				// vscode.commands.executeCommand('editor.foldAll'); 
				// vscode.commands.executeCommand('editor.unfold', { levels: 1, direction: 'up', selectionLines: [editor.document.lineCount - 1] });
			}
		});
	});

	// 2. 智能复制：System Prompt + Current Turn
	let copySmartCmd = vscode.commands.registerCommand('promptFlow.copyCurrent', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const doc = editor.document;
		const separatorPattern = /^\s*---\s*$/; // 正则匹配：只有 --- 的行
		const cursorLine = editor.selection.active.line;

		let systemPrompt = "";
		let currentPrompt = "";

		let separatorLines: number[] = [];

		// 1. 扫描所有分隔符的位置
		for (let i = 0; i < doc.lineCount; i++) {
			if (separatorPattern.test(doc.lineAt(i).text)) {
				separatorLines.push(i);
			}
		}

		// 2. 提取 System Prompt (文件的第一块内容)
		// 如果文件没有分隔符，整个文件就是 System Prompt (也是 Current)
		if (separatorLines.length === 0) {
			vscode.env.clipboard.writeText(doc.getText());
			vscode.window.setStatusBarMessage('Copied full text (No separators found).', 2000);
			return;
		}

		// 获取第一块内容作为 System Prompt
		const firstSeparatorLine = separatorLines[0];
		const systemRange = new vscode.Range(0, 0, firstSeparatorLine, 0);
		systemPrompt = doc.getText(systemRange).trim();

		// 3. 定位 Current Turn (当前光标所在的区块)
		let startLine = 0;
		let endLine = doc.lineCount;

		// 找到光标上方最近的分隔符
		const prevSepIndex = separatorLines.filter(line => line < cursorLine).pop();
		// 找到光标下方最近的分隔符
		const nextSepIndex = separatorLines.find(line => line > cursorLine);

		if (prevSepIndex !== undefined) {
			startLine = prevSepIndex + 1;
		}
		if (nextSepIndex !== undefined) {
			endLine = nextSepIndex;
		} else {
			// 如果下方没有分隔符，说明是在最后一块
			endLine = doc.lineCount;
		}

		// 如果光标就在 System Prompt 区域（即第一块），则不需要拼接，只复制这一块即可
		if (cursorLine < firstSeparatorLine) {
			vscode.env.clipboard.writeText(systemPrompt);
			vscode.window.setStatusBarMessage('Copied System Prompt.', 2000);
			return;
		}

		// 提取当前块文本
		const currentRange = new vscode.Range(startLine, 0, endLine, 0);
		currentPrompt = doc.getText(currentRange).trim();

		// 4. 拼接逻辑 (核心)
		// 可以在中间加一些换行，或者特定的提示词连接符
		const config = vscode.workspace.getConfiguration('promptFlow');
		const includeSystem = config.get('includeSystemPrompt', true);

		let finalContent = currentPrompt;
		if (includeSystem && cursorLine > firstSeparatorLine) {
			finalContent = `${systemPrompt}\n\n${currentPrompt}`;
		}

		vscode.env.clipboard.writeText(finalContent).then(() => {
			// 状态栏提示，告知用户拼接成功
			vscode.window.setStatusBarMessage('Copied: System Prompt + Current Turn', 3000);
		});
	});

	// 3. 复制全部历史 (Copy Full History)
	let copyHistoryCmd = vscode.commands.registerCommand('promptFlow.copyHistory', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const text = editor.document.getText();
		// 这里的逻辑可以扩展：是否需要过滤掉分隔符？通常为了发给AI，保留纯文本即可。
		// 如果你想让AI理解这是多轮对话，可以把 "---" 替换成 "User:" 之类的标记。

		vscode.env.clipboard.writeText(text).then(() => {
			vscode.window.setStatusBarMessage('Full prompt history copied!', 2000);
		});
	});

	// 1. 定义分隔符样式：柔和的分割线
	const separatorDecorationType = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,            // 仍然铺满整行，但背景透明
		backgroundColor: 'transparent', // 【关键】背景透明，不再是一大块色块

		// 【文本样式】把 "---" 变成浅灰色，视觉上弱化它
		color: new vscode.ThemeColor('editorCodeLens.foreground'),
		fontWeight: 'bold',

		// 【边框样式】只在这一行顶部加一条极细的线，模拟分割线效果
		borderWidth: '1px 0 0 0',     // 上 右 下 左 (只显示上边框)
		borderStyle: 'solid',
		borderColor: new vscode.ThemeColor('editorRuler.foreground'), // 使用标尺颜色，非常淡雅

		// 【尾部标签】
		after: {
			contentText: '  Prompt Turn  ', // 文字
			color: new vscode.ThemeColor('editorCodeLens.foreground'), // 浅灰色
			fontStyle: 'italic',
			margin: '0 0 0 10px' // 稍微离远一点
		}
	});

	function updateDecorations(editor: vscode.TextEditor) {
		if (!editor || editor.document.languageId !== 'markdown') {
			return;
		}

		const text = editor.document.getText();

		// 【修正】严格匹配：行首 + 可选空格 + --- + 可选空格 + 行尾
		// 这样绝对不会匹配到正文内容
		const separatorRegex = /^[\t ]*---[\t ]*$/gm;

		const separatorRanges: vscode.Range[] = [];
		let match;

		while ((match = separatorRegex.exec(text))) {
			const startPos = editor.document.positionAt(match.index);
			const endPos = editor.document.positionAt(match.index + match[0].length);

			// 创建装饰范围
			const range = new vscode.Range(startPos, endPos);
			separatorRanges.push(range);
		}

		// 应用装饰
		editor.setDecorations(separatorDecorationType, separatorRanges);
	}

	// A. 插件激活时，如果当前也是编辑器，立即渲染
	if (vscode.window.activeTextEditor) {
		updateDecorations(vscode.window.activeTextEditor);
	}

	// B. 切换文件 tab 时触发
	vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			updateDecorations(editor);
		}
	}, null, context.subscriptions);

	// C. 文本内容变化时触发 (这是为了实时更新，比如用户刚打出 --- 就会变色)
	vscode.workspace.onDidChangeTextDocument(event => {
		if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
			updateDecorations(vscode.window.activeTextEditor);
		}
	}, null, context.subscriptions);
}

// This method is called when your extension is deactivated
export function deactivate() { }
