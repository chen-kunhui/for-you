import { createApp } from 'vue';

function buildRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

export function initVueApp(app){
    const vscode = acquireVsCodeApi();
    let response = {}

    let postMessage = function(uri, params, callback) {
        let requestId = buildRequestId();
        vscode.postMessage({
            requestId: requestId,
            uri: uri,
            params: params
        });
        if (callback) {
            response[requestId] = { respondHandler: callback };
        }
    }
    window.addEventListener('message', event => {
        let requestId = event.data.requestId;
        response[requestId] && response[requestId].respondHandler(event);
    });

    let vueApp = createApp(app);

    vueApp.config.globalProperties.$vscode = vscode;
    vueApp.config.globalProperties.$postMessage = postMessage;

    return vueApp;
}