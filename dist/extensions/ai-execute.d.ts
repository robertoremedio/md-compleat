import { Extension } from '@tiptap/core';
import type { AiProvider } from '../ai/provider.js';
export interface AiExecuteOptions {
    shortcut: string;
    getProvider: () => AiProvider;
    onExecutionStateChange: (executing: boolean) => void;
    onError: (error: Error, type: string) => void;
}
export declare const AiExecute: Extension<AiExecuteOptions, any>;
