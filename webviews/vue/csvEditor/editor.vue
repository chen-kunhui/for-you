<template>
    <div class="xf-excel">
        <div class="cf-search">
            <input v-model="searchText" @input="updateSate" type="text" />
            <div>
                <span class="codicon codicon-search" @click="onSearch()"></span>
                <span class="codicon codicon-chrome-close" @click="closeSearchBox"></span>
            </div>
        </div>
        <div class="xf-excel-header">
            <div class="xf-excel-header-tool-btn" @click="saveDocument">
                <i class="codicon codicon-save"></i><span>保存(ctrl+S)</span>
            </div>
            <div class="xf-excel-header-tool-btn" @click="openSearchBox">
                <i class="codicon codicon-search"></i><span>搜索(ctrl+F)</span>
            </div>
            <div class="xf-excel-header-tool-btn" @click="openDoc">
                <i class="codicon codicon-library"></i><span>使用文档</span>
            </div>
            <div class="xf-excel-header-tool-btn" @click="feedback">
                <i class="codicon codicon-feedback"></i><span>使用反馈</span>
            </div>
        </div>
        <div class="xf-excel-content">
            <div class="xf-excel-preview-input">
                <div><i class="codicon codicon-edit"></i><span>{{activeCellName}}</span></div>
                <textarea class="xf-excel-preview-textarea" @input="onTextareaInput"></textarea>
            </div>
            <div class="xf-excel-body">
                <table cellspacing="0" border="0" cellpadding="0" @click="onTableClick">
                    <thead>
                        <tr>
                            <th v-for="(value, index) in tableHeader" :key="index">{{value}}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <textarea class="cell-editor" style="visibility: hidden;" @input="onTextareaInput"></textarea>
                        <tr v-for="(tr, index) in tableData" :key="index">
                            <td class="row-num">
                                {{tr.rowNo}}
                            </td>
                            <td v-for="(td, i) in tr.cells" :key="i"><div class="xf-csv-tr-data">{{td}}</div></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="xf-excel-footer">
                <div class="xf-excel-status-bar">
                    <div><span :title="'文件总行数 | csv总行数'">【{{lineCount}}|{{rowTotal}}】</span></div>
                    <div><span>总条数</span><span>({{dataTotal}})</span></div>
                    <div><span>每页显示条数</span><span>({{prePage}})</span></div>
                    <div><span>当前选中单元格</span><span>({{activeCellName}})</span></div>
                    
                </div>
                <div class="xf-excel-pagination">
                    <button @click="gotoLastPage">上一页</button>
                    <select v-model="page" @change="gotoPage">
                        <option v-for="i in pageTotal" :key="i" :value="i">{{i}}</option>
                    </select>
                    <button @click="gotoNextPage">下一页</button>
                </div>
            </div>
        </div>
        <div class="xf-contextmenu">
            <ul>
                <li @click="insertRow('after')">在下方插入行</li>
                <li @click="insertRow('before')">在上方插入行</li>
            </ul>
        </div>
    </div>
</template>

<script>
import { excelHeaderMap } from "./excelColMap.js";

let textarea = null;
let previewTextarea = null;
let activeCell = null;
let timer = null;
let csvTable = null;
let vscodeState = {
    page: 1,
    prePage: 100,
    searchText: '',
    lastTriggerSearchTxt: '',
    searchVisiable: false,
    activeCellPosition: {
        x: 1,
        y: 1
    }
}

export default {
    data() {
        return {
            inited: false,
            tableHeader: excelHeaderMap,
            tableData: [], // [{rowNo: 0, data: [1,2,3]}, ...]
            searchText: '',
            lastTriggerSearchTxt: '',
            lineCount: 0,
            rowTotal: 0,
            dataTotal: 0,
            page: 1,
            prePage: 100,
            activeCellPosition: {
                x: 1,
                y: 1
            }
        }
    },
    mounted() {
        this.$postMessage('/init', {}, (e) => {
            if(this.$vscode.getState()) {
                vscodeState = this.$vscode.getState();
            } else {
                this.$vscode.setState(vscodeState);
            }
            this.page = vscodeState.page
            this.prePage = vscodeState.prePage
            this.activeCellPosition.x = vscodeState.activeCellPosition.x
            this.activeCellPosition.y = vscodeState.activeCellPosition.y
            this.searchText = vscodeState.searchText
            this.lastTriggerSearchTxt = vscodeState.lastTriggerSearchTxt
            if (vscodeState.searchVisiable) {
                let search = this.$el.querySelector('.cf-search')
                search.setAttribute('style', 'visibility: visible')
            }

            this.gotoPage();

            this.$listenMsg('/update/table', () => {
                this.gotoPage();
            })
        });
    },
    computed: {
        pageTotal() {
            return Math.ceil(this.dataTotal / this.prePage)
        },
        activeCellName() {
            let row = this.tableData[this.activeCellPosition.y - 1]?.rowNo || ''
            return `${excelHeaderMap[this.activeCellPosition.x]}${row}`
        }
    },
    methods: {
        updateSate() {
            vscodeState.searchText = this.searchText
            this.$vscode.setState(vscodeState);
        },
        openDoc() {
            this.$postMessage('/open/doc', {}, () => {});
        },
        feedback() {
            this.$postMessage('/open/feedback', {}, () => {});
        },
        saveDocument() {
            this.$postMessage('/save/document', {}, () => {});
        },
        openSearchBox() {
            let muen = document.querySelector('.xf-contextmenu');
            muen.setAttribute('style', 'hidden');
            let search = this.$el.querySelector('.cf-search')
            let input = search.querySelector('input')
            search.setAttribute('style', 'visibility: visible')
            input.focus();
            vscodeState.searchVisiable = true
            this.$vscode.setState(vscodeState);
        },
        initEvent() {
            if (this.inited) return;

            document.addEventListener('contextmenu',(e)=>{
                e.preventDefault();
                let muen = document.querySelector('.xf-contextmenu');
                if (e.target.tagName === 'TD' && !e.target.className.includes("row-num")) {
                    this.resetTextarea(e.target);
                    muen.setAttribute('style', `visibility: visible; top: ${e.y}px;left: ${e.x}px;`)
                } else if (e.target.className.includes('xf-csv-tr-data')) {
                    this.resetTextarea(e.target.parentNode);
                    muen.setAttribute('style', `visibility: visible; top: ${e.y}px;left: ${e.x}px;`)
                } else if (e.target.tagName === 'TEXTAREA' && e.target.className.includes('cell-editor')) {
                    muen.setAttribute('style', `visibility: visible; top: ${e.y}px;left: ${e.x}px;`)
                } else {
                    muen.setAttribute('style', 'hidden');
                }
            })
            document.addEventListener('click', () => {
                let muen = document.querySelector('.xf-contextmenu');
                muen.setAttribute('style', 'hidden');
            })
            document.addEventListener('keydown',(e)=>{
                if(e.ctrlKey && e.key=== 'f'){
                    this.openSearchBox();
                } else if (e.ctrlKey && e.key=== 's') {
                    this.saveDocument();
                }
            })

            let objResizeObserver = new ResizeObserver((entries) => {
                if (entries[0] && entries[0].target.tagName === 'TD') {
                    this.resetTextarea(activeCell, false)
                }
            });
            objResizeObserver.observe(activeCell);
        },
        closeSearchBox() {
            let search = this.$el.querySelector('.cf-search');
            search.setAttribute('style', 'visibility: hidden');
            this.searchText = '';
            vscodeState.searchText = ''
            vscodeState.searchVisiable = false
            this.lastTriggerSearchTxt = this.searchText
            vscodeState.lastTriggerSearchTxt = this.lastTriggerSearchTxt
            this.$vscode.setState(vscodeState);
            this.gotoPage(null, 1);
        },
        onSearch() {
            this.lastTriggerSearchTxt = this.searchText
            vscodeState.lastTriggerSearchTxt = this.lastTriggerSearchTxt
            this.$vscode.setState(vscodeState);
            this.gotoPage(null, 1);
        },
        onTableClick(e) {
            if (e.target.tagName === 'TD') {
                this.resetTextarea(e.target)
            } else if (e.target.className.includes('xf-csv-tr-data')) {
                this.resetTextarea(e.target.parentNode)
            }
        },
        onTextareaInput(e) {
            if(e.target.className.includes("xf-excel-preview-textarea")) {
                textarea.value = previewTextarea.value
            } else if (e.target.className.includes("cell-editor")) {
                previewTextarea.value = textarea.value
            } else {
                return;
            }

            if (timer) { clearInterval(timer);}
            timer = setInterval(() => {
                clearInterval(timer)
                this.updateDocument(activeCell, textarea.value)
            }, 500)
        },
        resetTextarea(cell, resetValue = true){
            if (!cell) {
                textarea.setAttribute('style', `visibility: hidden;`);
                previewTextarea.setAttribute('disabled', 'disabled');
                textarea.value = '';
                previewTextarea.value = '';
                return;
            }

            if(cell.className.includes("row-num")) {
                return
            }

            activeCell = cell

            let row = cell.parentElement.rowIndex
            let col = cell.cellIndex
            this.activeCellPosition.x = col
            this.activeCellPosition.y = row
            vscodeState.activeCellPosition.x = col
            vscodeState.activeCellPosition.y = row
            this.$vscode.setState(vscodeState);

            let text = activeCell.innerText
            let offsetWidth = activeCell.offsetWidth
            let offsetHeight = activeCell.offsetHeight
            let offsetTop = activeCell.offsetTop - 1
            let offsetLeft = activeCell.offsetLeft
            textarea.setAttribute('style', `visibility: visible; top: ${offsetTop}px;left: ${offsetLeft}px; width: ${offsetWidth - 11}px; height: ${offsetHeight - 11}px; padding: 5px;`);
            previewTextarea.removeAttribute('disabled');
            if (resetValue) {
                textarea.value = text
                previewTextarea.value = textarea.value
            }
        },
        updateDocument(cell, text){
            let row = cell.parentElement.rowIndex - 1;
            let col = cell.cellIndex - 1;
            let line = this.tableData[row].rowNo - 1;

            this.$postMessage('/update/document', {
                text: text,
                row: line,
                col: col
            }, (e) => {
                if (e.data.success) {
                    this.tableData[row].cells[col] = text;
                } else {
                    console.error("=====修改文档失败=====")
                }
            });
        },
        gotoLastPage(e) {
            if (this.page !== 1) {
                this.gotoPage(e, this.page - 1)
            }
        },
        gotoNextPage(e) {
            if (this.page < this.pageTotal) {
                this.gotoPage(e, this.page + 1)
            }
        },
        gotoPage(e, page) {
            if (page) {
                this.page = page
            }

            let params = {
                page: this.page,
                prePage: this.prePage,
                search: this.lastTriggerSearchTxt
            }

            this.$postMessage('/get/document', params, (e) => {
                this.lineCount = e.data.lineCount;
                this.rowTotal = e.data.rowTotal;
                this.dataTotal = e.data.dataTotal;
                this.tableData = this.initTableData(e.data.tableData);

                this.$nextTick(function() {
                    if (!this.inited) {
                        previewTextarea = this.$el.querySelector('.xf-excel-preview-textarea');
                        textarea = this.$el.querySelector('.cell-editor');
                        csvTable = this.$el.querySelector('table');
                        try {
                            activeCell = csvTable.rows[this.activeCellPosition.y].cells[this.activeCellPosition.x];
                        } catch (error) {
                            activeCell = null;
                        }
                        this.initEvent();
                        this.inited = true
                    } else {
                        vscodeState.page = this.page;
                        this.$vscode.setState(vscodeState);
                        activeCell = csvTable.querySelector('td:nth-child(2)');
                    }

                    this.resetTextarea(activeCell);
                })
            })
        },
        initTableData(data) {
            let colSize = this.tableHeader.length - 1
            let result = new Array(this.prePage)
            if (this.lastTriggerSearchTxt) {
                result = new Array(data.length);
            }

            let tempi = [];
            let row = 0;
            let concatArry = new Array(colSize);
            let valid = false; // 标识该条数据是否是文件中真实存在的数据
            for (let index = 0; index < result.length; index ++) {
                if (data[index]) {
                    row = data[index].rowNo;
                    valid = true;
                } else {
                    row += 1;
                    valid = false;
                }
                tempi = data[index]?.cells || []

                if (tempi.length >= colSize) {
                    result[index] = { valid: valid, rowNo: row, cells: tempi }
                } else {
                    result[index] = { valid: valid, rowNo: row, cells: tempi.concat(concatArry.slice(0, colSize - tempi.length).join(',').split(','))}
                }
            }
            return result
        },
        insertRow(position) {
            let row = activeCell.parentElement.rowIndex - 1;
            let col = activeCell.cellIndex;
            if (!this.tableData[row].valid) {
                return;
            }
            let line = this.tableData[row].rowNo - 1;
            let params = {
                rowNo: line,
                insterPosition: position,
                page: this.page,
                prePage: this.prePage,
                search: this.lastTriggerSearchTxt
            }
            this.$postMessage('/insert/row', params, (e) => {
                if (e.data.success) {
                    this.lineCount = e.data.lineCount;
                    this.rowTotal = e.data.rowTotal;
                    this.dataTotal = e.data.dataTotal;
                    this.tableData = this.initTableData(e.data.tableData);
                    this.$nextTick(function() {
                        let newrow = position === 'before' ? row + 2 : row + 1;
                        activeCell = csvTable.rows[newrow].cells[col];
                        this.resetTextarea(activeCell);
                    });
                }
            })
        }
    }
}
</script>
