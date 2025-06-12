/**
 * Esor Framework Type Definitions
 * Lightweight reactive framework built on Web Components
 */

// ========== CORE REACTIVITY ==========

export interface Signal<T = any> {
  (): T;
  (value: T | ((prev: T) => T)): T;
}

export interface ComputedSignal<T = any> {
  (): T;
}

export interface EffectCleanup {
  (): void;
}

export declare function signal<T>(initialValue: T): Signal<T>;
export declare function computed<T>(fn: () => T): ComputedSignal<T>;
export declare function effect(fn: () => void | EffectCleanup): EffectCleanup;
export declare function batch<T>(fn: () => T): T;

// ========== TEMPLATING ==========

export type TemplateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Node
  | Node[]
  | Signal<any>
  | ComputedSignal<any>
  | (() => any);

export type EventHandler<E extends Event = Event> = (event: E) => void;

export declare function html(
  strings: TemplateStringsArray,
  ...values: TemplateValue[]
): Node[];

// ========== COMPONENTS ==========

export interface ComponentProps {
  [key: string]: Signal<any>;
}

export type ComponentSetup = (props: ComponentProps) => Node[] | (() => Node[]);

export interface ComponentOptions {
  shadowMode?: "open" | "closed";
}

export declare function component(
  tagName: string,
  setup?: ComponentSetup,
  options?: ComponentOptions
): void;

// ========== LIFECYCLE HOOKS ==========

export declare function beforeMount(fn: () => void): void;
export declare function onMount(fn: () => void): void;
export declare function beforeUpdate(fn: () => void): void;
export declare function onUpdate(fn: () => void): void;
export declare function onDestroy(fn: () => void): void;
export declare function onEffect(fn: () => void | (() => void)): () => void;
export declare function getCurrentContext(): HTMLElement | null;

// ========== UTILITIES ==========

export interface Ref<T = HTMLElement> {
  current: T | null;
}

export declare function ref<T = HTMLElement>(initialValue?: T | null): Ref<T>;

export declare function emit(
  name: string,
  detail?: any,
  target?: EventTarget | null
): CustomEvent;

// ========== JSX SUPPORT ==========

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: {
        [key: string]: any;
        // Event handlers
        onclick?: EventHandler<MouseEvent>;
        onchange?: EventHandler<Event>;
        oninput?: EventHandler<InputEvent>;
        onsubmit?: EventHandler<SubmitEvent>;
        onkeydown?: EventHandler<KeyboardEvent>;
        onkeyup?: EventHandler<KeyboardEvent>;
        onfocus?: EventHandler<FocusEvent>;
        onblur?: EventHandler<FocusEvent>;

        // Common attributes with signal support
        class?: string | Signal<string>;
        id?: string | Signal<string>;
        style?: string | Record<string, string | Signal<string>>;

        // Form elements
        value?: string | number | Signal<string | number>;
        checked?: boolean | Signal<boolean>;
        disabled?: boolean | Signal<boolean>;

        // Ref support
        ref?: Ref<HTMLElement> | ((el: HTMLElement) => void);

        // Children
        children?: any;
      };
    }

    interface Element extends Array<Node> {}

    interface ElementClass {
      render(): Node[];
    }

    interface ElementAttributesProperty {
      props: {};
    }

    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

// ========== CUSTOM ELEMENTS AUGMENTATION ==========

declare global {
  interface HTMLElementTagNameMap {
    [K: string]: HTMLElement;
  }

  interface HTMLElement {
    emit?: (name: string, detail?: any) => CustomEvent;
    props?: ComponentProps;
  }
}

// ========== MODULE EXPORTS ==========

declare const _default: {
  signal: typeof signal;
  computed: typeof computed;
  effect: typeof effect;
  batch: typeof batch;
  html: typeof html;
  component: typeof component;
  beforeMount: typeof beforeMount;
  onMount: typeof onMount;
  beforeUpdate: typeof beforeUpdate;
  onUpdate: typeof onUpdate;
  onDestroy: typeof onDestroy;
  onEffect: typeof onEffect;
  getCurrentContext: typeof getCurrentContext;
  ref: typeof ref;
  emit: typeof emit;
};

export default _default;
