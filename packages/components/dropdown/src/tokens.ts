import type { ComputedRef, InjectionKey, Ref } from 'vue'

export type ElDropdownInjectionContext = {
  contentRef: Ref<HTMLElement | null>
  role: ComputedRef<string>
  triggerId: ComputedRef<string>
  isUsingKeyboard: Ref<boolean>
  onItemLeave: (e: PointerEvent) => void
  onItemEnter: (e: PointerEvent) => void
  updatePopconfirmPopperContentRef: (
    popconfirmPopperContentRef: HTMLElement
  ) => void
  popconfirmPopperContentRef: Ref<HTMLElement>
}

export const DROPDOWN_INJECTION_KEY: InjectionKey<ElDropdownInjectionContext> =
  Symbol('elDropdown')
