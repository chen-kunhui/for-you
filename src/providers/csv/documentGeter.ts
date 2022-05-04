import * as vscode from 'vscode';
import { oneLineCsvStr2Array } from './helper';
import { RowInfo } from './interface';
import { PageManager } from './pageManager';

export class DocumentGeter {
    private searchTxt: string = '';

    constructor(
        private document: vscode.TextDocument,
        private pageManager: PageManager,
        private webview: vscode.Webview
    ) {}

    getDocument(request: any) {
        let search = request.params.search;
        if (search) {
            this.bySearch(request);
        } else {
            this.noneSearch(request);
        }
	}

    private noneSearch(request: any) {
        let startAt: Date = new Date();
        this.searchTxt = '';
        this.pageManager.clearFilter();
        let page: number = request.params.page <= 1 ? 1 : request.params.page;
        let prePage: number = request.params.prePage <= 0 ? 100 : request.params.prePage;
        let rowTotal: number = this.pageManager.rowTotal();
        let pageTotal: number = Math.ceil(rowTotal / prePage);
        let lineCount: number = this.document.lineCount;

		if (page > pageTotal) { // 已经读到了最后一行
			this.webview.postMessage({
                success: true,
                requestId: request.requestId,
                lineCount: lineCount,
                dataTotal: rowTotal,
                filterRowTotal: rowTotal,
                rowTotal: rowTotal,
                tableData: []
            })
            return;
		}

        const tableData: RowInfo[] = [];
        let startNum: number = page <= 1 ? 0 : (page - 1) * prePage;
        let endNum: number = page * prePage > rowTotal ? rowTotal : page * prePage;

        for (let line = startNum; line < endNum; line ++) {
            let rowInfo = this.pageManager.getRowInfo(line)
            let startLine = this.document.lineAt(rowInfo.startLine)
            let endLine = this.document.lineAt(rowInfo.endLine)
            let range: vscode.Range = new vscode.Range(startLine.range.start, endLine.range.end)
            let textLine: string = this.document.getText(range);
            let csv = oneLineCsvStr2Array(textLine);

            tableData.push({
                rowNo: rowInfo.rowNo,
                cells: csv
            });
        }
        console.log(`获取第${page} 页,${prePage}条数据耗时: ${new Date().getTime() - startAt.getTime()}ms`);

        this.webview.postMessage({
            success: true,
            requestId: request.requestId,
            lineCount: lineCount,
            dataTotal: rowTotal,
            filterRowTotal: rowTotal,
            rowTotal: rowTotal,
            tableData: tableData
        })
    }

    private bySearch(request: any) {
        if (this.searchTxt !== request.params.search) {
            this.searchTxt = request.params.search;
            this.pageManager.initFilterCache(this.searchTxt, this.document);
        }
        let startAt: Date = new Date();
        let page: number = request.params.page <= 1 ? 1 : request.params.page;
        let prePage: number = request.params.prePage <= 0 ? 100 : request.params.prePage;
        let rowTotal: number = this.pageManager.rowTotal();
        let filterTotal: number = this.pageManager.filterTotal();
        let pageTotal: number = Math.ceil(filterTotal / prePage);
        let lineCount: number = this.document.lineCount;

		if (page > pageTotal) { // 已经读到了最后一行
			this.webview.postMessage({
                success: true,
                requestId: request.requestId,
                lineCount: lineCount,
                dataTotal: filterTotal,
                rowTotal: rowTotal,
                filterRowTotal: filterTotal,
                tableData: []
            })
            return;
		}

        const tableData: RowInfo[] = [];
        let startNum: number = page <= 1 ? 0 : (page - 1) * prePage;
        let endNum: number = page * prePage > filterTotal ? filterTotal : page * prePage;

        for (let i = startNum; i < endNum; i ++) {
            let line = this.pageManager.getFilterRow(i);
            let rowInfo = this.pageManager.getRowInfo(line);
            let startLine = this.document.lineAt(rowInfo.startLine)
            let endLine = this.document.lineAt(rowInfo.endLine)
            let range: vscode.Range = new vscode.Range(startLine.range.start, endLine.range.end)
            let textLine: string = this.document.getText(range);
            let csv = oneLineCsvStr2Array(textLine);

            tableData.push({
                rowNo: rowInfo.rowNo,
                cells: csv
            });
        }
        console.log(`获取第${page} 页,${prePage}条数据耗时: ${new Date().getTime() - startAt.getTime()}ms`);

        this.webview.postMessage({
            success: true,
            requestId: request.requestId,
            lineCount: lineCount,
            dataTotal: filterTotal,
            filterRowTotal: filterTotal,
            rowTotal: rowTotal,
            tableData: tableData
        })
    }
}
 