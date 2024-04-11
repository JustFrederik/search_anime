/* tslint:disable */
/* eslint-disable */
/**
* @returns {number}
*/
export function count(): number;
/**
* @param {string} s
*/
export function initialize(s: string): void;
/**
* @param {string} query
* @param {number} page
* @param {number} items
* @returns {any}
*/
export function search(query: string, page: number, items: number): any;
/**
* @param {number} page
* @param {number} items
* @returns {any}
*/
export function tags(page: number, items: number): any;
/**
* @param {string} query
* @param {number} page
* @param {number} items
* @returns {any}
*/
export function tag_search(query: string, page: number, items: number): any;
/**
* @param {string} query
* @returns {number}
*/
export function search_count(query: string): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly count: () => number;
  readonly initialize: (a: number, b: number) => void;
  readonly search: (a: number, b: number, c: number, d: number) => number;
  readonly tags: (a: number, b: number) => number;
  readonly tag_search: (a: number, b: number, c: number, d: number) => number;
  readonly search_count: (a: number, b: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
