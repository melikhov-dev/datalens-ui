import https from 'https';

import {AppContext} from '@gravity-ui/nodekit';
import axios from 'axios';

import Utils from '../../../utils';
import {ProcessorParams} from '../components/processor';
import {getDuration} from '../components/utils';

import {RunnerHandlerProps} from '.';

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
});

export const runServerlessEditor = (
    parentContext: AppContext,
    {chartsEngine, req, res, config, configResolving, workbookId}: RunnerHandlerProps,
) => {
    const ctx = parentContext.create('editorChartRunner');

    const hrStart = process.hrtime();

    const {params, actionParams, widgetConfig} = req.body;

    const iamToken = res?.locals?.iamToken ?? req.headers[ctx.config.headersMap.subjectToken];

    const processorParams: Omit<ProcessorParams, 'ctx'> = {
        chartsEngine,
        paramsOverride: params,
        actionParamsOverride: actionParams,
        widgetConfig,
        userLang: res.locals && res.locals.lang,
        userLogin: res.locals && res.locals.login,
        userId: res.locals && res.locals.userId,
        subrequestHeaders: res.locals.subrequestHeaders,
        req,
        iamToken,
        isEditMode: Boolean(res.locals.editMode),
        configResolving,
        cacheToken: req.headers['x-charts-cache-token'] || null,
    };

    if (req.body.unreleased === 1) {
        processorParams.useUnreleasedConfig = true;
    }

    if (config) {
        processorParams.configOverride = config;
    }

    if (workbookId) {
        processorParams.workbookId = workbookId;
    }

    if (req.body.uiOnly) {
        processorParams.uiOnly = true;
    }

    processorParams.responseOptions = req.body.responseOptions || {};

    if (
        processorParams.responseOptions &&
        typeof processorParams.responseOptions.includeLogs === 'undefined'
    ) {
        processorParams.responseOptions.includeLogs = true;
    }

    ctx.log('ServerlessEditorRunner::PreRun', {duration: getDuration(hrStart)});

    ctx.call('engineProcessing', (cx) => {
        console.log(req.body.config);
        const json = JSON.stringify(req.body);
        console.log(json);
        return axiosInstance
            .post('https://functions.cloud-preprod.yandex.net/b09ofmog7452cvk6tjdt', json, {
                headers: {
                    Authorization: 'Api-Key',
                    'Content-Type': 'application/json',
                },
            })
            .then((result) => {
                cx.log('ServerlessEditorRunner::FullRun', {duration: getDuration(hrStart)});

                if (result) {
                    console.log(result.data);
                    // TODO use ShowChartsEngineDebugInfo flag

                    // if ('error' in result) {
                    //     const resultCopy = {...result};

                    //     if ('_confStorageConfig' in resultCopy) {
                    //         delete resultCopy._confStorageConfig;
                    //     }

                    //     cx.log('PROCESSED_WITH_ERRORS', {error: result.error});

                    //     let statusCode = 500;

                    //     if (isObject(result.error) && !showChartsEngineDebugInfo) {
                    //         const {error} = result;
                    //         if ('debug' in error) {
                    //             delete error.debug;
                    //         }

                    //         const {details} = error;

                    //         if (details) {
                    //             delete details.stackTrace;

                    //             if (details.sources) {
                    //                 const {sources} = details;

                    //                 Object.keys(sources).forEach((source) => {
                    //                     if (sources[source]) {
                    //                         const {body} = sources[source];

                    //                         if (body) {
                    //                             delete body.debug;
                    //                         }
                    //                     }
                    //                 });
                    //             }
                    //         }
                    //     }

                    //     if (isObject(result.error) && result.error.statusCode) {
                    //         statusCode = result.error.statusCode;

                    //         delete result.error.statusCode;
                    //     }

                    //     res.status(statusCode).send(result);
                    // } else {

                    cx.log('PROCESSED_SUCCESSFULLY');

                    res.status(200).send(result.data.processResult);
                    // }
                } else {
                    throw new Error('INVALID_PROCESSING_RESULT');
                }
            })
            .catch((error) => {
                const message = Utils.getErrorMessage(error);

                cx.logError('PROCESSING_FAILED', new Error(message));
                const result = {
                    error: {
                        code: 'ERR.CHARTS.UNHANDLED_ERROR',
                        debug: {
                            message,
                        },
                    },
                };
                res.status(500).send(result);
            })
            .finally(() => {
                ctx.end();
            });
    }).catch((error) => {
        ctx.logError('CHARTS_ENGINE_PROCESSOR_UNHANDLED_ERROR', error);
        ctx.end();
        res.status(500).send('Internal error');
    });
};
