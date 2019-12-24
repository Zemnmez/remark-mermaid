import { Processor } from 'unified';

declare module 'unified-args' {
    interface Configuration {
        processor: Processor
        description: string,
        version: string,
        ignoreName: string,
        rcName: string,
        packageField: string,
        pluginPrefix: string
    }
    export type Start = (conf: Configuration) => void
}

declare const start: Start;
export default start;