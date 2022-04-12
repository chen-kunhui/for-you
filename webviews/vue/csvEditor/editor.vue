<template>
    <div class="xf-excel">
        <div class="cf-search">
            <input v-model="searchText" @input="updateSate" type="text" />
            <div>
                <span class="codicon codicon-search" @click="onSearch()"></span>
                <span class="codicon codicon-chrome-close" @click="closeSearchBox"></span>
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
                            <td class="row-num">{{index + rowStarIndex + 1}}</td>
                            <td v-for="(td, index) in tr" :key="index">{{td}}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="xf-excel-footer">
                <div class="xf-excel-status-bar">
                    <div><span>数据总条数</span><span>({{lineCount}})</span></div>
                    <div><span>总页数</span><span>({{pageTotal}})</span></div>
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
    rowStarIndex: 0,
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
            tableData: [],
            searchText: '',
            lastTriggerSearchTxt: '',
            lineCount: 0,
            rowStarIndex: 0,
            page: 1,
            prePage: 100,
            activeCellPosition: {
                x: 1,
                y: 1
            }
        }
    },
    mounted() {
        if(this.$vscode.getState()) {
            vscodeState = this.$vscode.getState();
        } else {
            this.$vscode.setState(vscodeState);
        }
        this.page = vscodeState.page
        this.prePage = vscodeState.prePage
        this.rowStarIndex = vscodeState.rowStarIndex
        this.activeCellPosition.x = vscodeState.activeCellPosition.x
        this.activeCellPosition.y = vscodeState.activeCellPosition.y
        this.searchText = vscodeState.searchText
        this.lastTriggerSearchTxt = vscodeState.lastTriggerSearchTxt
        if (vscodeState.searchVisiable) {
            let search = this.$el.querySelector('.cf-search')
            search.setAttribute('style', 'visibility: visible')
        }

        this.gotoPage()
    },
    computed: {
        pageTotal() {
            return Math.ceil(this.lineCount / this.prePage)
        },
        activeCellName() {
            return `${excelHeaderMap[this.activeCellPosition.x]}${this.activeCellPosition.y + this.rowStarIndex}`
        }
    },
    methods: {
        updateSate() {
            vscodeState.searchText = this.searchText
            this.$vscode.setState(vscodeState);
        },
        initEvent() {
            if (this.inited) return;

            document.addEventListener('keydown',(e)=>{
                if(e.ctrlKey && e.key=== 'f'){
                    let search = this.$el.querySelector('.cf-search')
                    let input = search.querySelector('input')
                    search.setAttribute('style', 'visibility: visible')
                    input.focus();
                    vscodeState.searchVisiable = true
                    this.$vscode.setState(vscodeState);
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
            if (timer) {
                clearInterval(timer)
            }
            timer = setInterval(() => {
                clearInterval(timer)
                this.updateDocument(activeCell, textarea.value)
            }, 300)
        },
        resetTextarea(cell, resetValue = true){
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
            textarea.setAttribute('style', `visibility: visible; top: ${offsetTop}px;left: ${offsetLeft}px; width: ${offsetWidth - 11}px; height: ${offsetHeight - 11}px; padding: 5px;`)
            if (resetValue) {
                textarea.value = text
                previewTextarea.value = textarea.value
            }
        },
        updateDocument(cell, text){
            let row = cell.parentElement.rowIndex - 1
            let col = cell.cellIndex - 1
            
            this.tableData[row][col] = text

            this.$postMessage('/update/document', {
                text: text,
                row: row + this.rowStarIndex,
                col: col
            }, (e) => {
                console.log("----postMessage----", e)
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
                this.tableData = this.initTableData(e.data.data);
                this.rowStarIndex = e.data.startLine
                this.lineCount = e.data.lineCount;

                this.$nextTick(function() {
                    if (!this.inited) {
                        this.inited = true
                        previewTextarea = this.$el.querySelector('.xf-excel-preview-textarea');
                        textarea = this.$el.querySelector('.cell-editor');
                        csvTable = this.$el.querySelector('table');
                        activeCell = csvTable.rows[this.activeCellPosition.y].cells[this.activeCellPosition.x];
                        this.initEvent();
                    } else {
                        vscodeState.page = this.page;
                        vscodeState.rowStarIndex = this.rowStarIndex;
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
            let tempi = []
            let concatArry = new Array(colSize)
            for (let index = 0; index < result.length; index ++) {
                tempi = data[index] || []
                if (tempi.length >= colSize) {
                    result[index] = tempi
                } else {
                    result[index] = tempi.concat(concatArry.slice(0, colSize - tempi.length).join(',').split(','))
                }
            }
            return result
        }
    }
}
</script>
