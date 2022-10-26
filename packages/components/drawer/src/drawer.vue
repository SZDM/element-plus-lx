<template>
  <teleport
    :to="teleportSelector"
    :disabled="!appendToBody && !appendToSelector"
  >
    <transition
      :name="ns.b('fade')"
      @after-enter="afterEnter"
      @after-leave="afterLeave"
      @before-leave="beforeLeave"
    >
      <el-overlay
        v-show="visible"
        :id="overlayId"
        :class="{ 'user-select-none': useColResize }"
        :mask="modal"
        :overlay-class="modalClass"
        :z-index="zIndex"
        @click="onModalClick"
        @mouseup="mouseUp"
      >
        <el-focus-trap
          loop
          :trapped="visible"
          :focus-trap-el="drawerRef"
          :focus-start-el="focusStartRef"
          @release-requested="onCloseRequested"
        >
          <div
            v-if="isColResize"
            class="col-resize"
            :style="{
              [direction === 'ltr'
                ? 'left'
                : 'right']: `calc(${drawerSize} - 15px)`,
            }"
            @mousedown="mouseDown"
          />
          <div
            ref="drawerRef"
            aria-modal="true"
            :aria-label="title || undefined"
            :aria-labelledby="!title ? titleId : undefined"
            :aria-describedby="bodyId"
            :class="[ns.b(), direction, visible && 'open', customClass]"
            :style="[
              isHorizontal ? 'width: ' + drawerSize : 'height: ' + drawerSize,
              useColResize ? 'transition: all 0s ease 0s' : '',
            ]"
            role="dialog"
            @click.stop
          >
            <span ref="focusStartRef" :class="ns.e('sr-focus')" tabindex="-1" />
            <header v-if="withHeader" :class="ns.e('header')">
              <slot
                v-if="!$slots.title"
                name="header"
                :close="handleClose"
                :title-id="titleId"
                :title-class="ns.e('title')"
              >
                <span
                  v-if="!$slots.title"
                  :id="titleId"
                  role="heading"
                  :class="ns.e('title')"
                >
                  {{ title }}
                </span>
              </slot>
              <slot v-else name="title">
                <!-- DEPRECATED SLOT -->
              </slot>
              <button
                v-if="showClose"
                :aria-label="t('el.drawer.close')"
                :class="ns.e('close-btn')"
                type="button"
                @click="handleClose"
              >
                <el-icon :class="ns.e('close')"><close /></el-icon>
              </button>
            </header>
            <template v-if="rendered">
              <div
                v-if="disabledScrollbar"
                :id="bodyId"
                :class="[ns.e('body'), 'is-disabled']"
              >
                <slot />
              </div>
              <el-scrollbar v-else always>
                <div :id="bodyId" :class="ns.e('body')">
                  <slot />
                </div>
              </el-scrollbar>
            </template>
            <div v-if="$slots.footer" :class="ns.e('footer')">
              <div :id="teleportAlert" />
              <div>
                <slot name="footer" />
              </div>
            </div>
          </div>
        </el-focus-trap>
      </el-overlay>
    </transition>
  </teleport>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  provide,
  ref,
} from 'vue'
import { Close } from '@element-plus/icons-vue'

import { ElOverlay } from '@element-plus/components/overlay'
import ElFocusTrap from '@element-plus/components/focus-trap'
import { useDialog } from '@element-plus/components/dialog'
import {
  addResizeListener,
  addUnit,
  removeResizeListener,
} from '@element-plus/utils'
import ElIcon from '@element-plus/components/icon'
import {
  useDeprecated,
  useId,
  useLocale,
  useNamespace,
} from '@element-plus/hooks'
import ElScrollbar from '@element-plus/components/scrollbar'
import { drawerEmits, drawerProps } from './drawer'
import useDrawerInfo from './drawer-info'
import type { ResizableElement } from '@element-plus/utils'

export default defineComponent({
  name: 'ElDrawer',
  components: {
    ElOverlay,
    ElFocusTrap,
    ElIcon,
    Close,
    ElScrollbar,
  },
  props: drawerProps,
  emits: {
    ...drawerEmits,
    vanish: () => true,
    action: () => true,
    'update:size': (size) => true,
  },

  setup(props, { slots, emit }) {
    useDeprecated(
      {
        scope: 'el-drawer',
        from: 'the title slot',
        replacement: 'the header slot',
        version: '3.0.0',
        ref: 'https://element-plus.org/en-US/component/drawer.html#slots',
      },
      computed(() => !!slots.title)
    )

    const drawerRef = ref<HTMLElement>()
    const focusStartRef = ref<HTMLElement>()
    const ns = useNamespace('drawer')
    const { t } = useLocale()

    const isHorizontal = computed(
      () => props.direction === 'rtl' || props.direction === 'ltr'
    )
    const drawerSize = computed(() => addUnit(props.size))

    const usedDialog = useDialog(props, drawerRef)
    const afterLeave = () => {
      usedDialog.afterLeave()
      emit('action')
      emit('vanish')
    }
    const isColResize = computed(() => {
      return isHorizontal.value
    })
    const overlayId = useId().value
    const useColResize = ref(false)
    let overlayDOM: HTMLElement | null = null
    let initialSizePercentage = 30
    if (typeof props.size === 'string') {
      initialSizePercentage = Number(props.size.replace('%', ''))
    }
    const mouseDown = () => {
      useColResize.value = true
      overlayDOM!.onmousemove = mouseMove
    }
    const mouseUp = () => {
      useColResize.value = false
      overlayDOM!.onmousemove = null
    }
    const mouseMove = (event) => {
      const screenWidth = document.body.offsetWidth
      const maxSizePercentage = 95
      const clientXLeft = event.clientX
      const clientXRight = screenWidth - clientXLeft
      const clientX = props.direction === 'ltr' ? clientXLeft : clientXRight
      const drawerSize = clientX / screenWidth
      const size = Number((drawerSize * 100).toFixed(2))
      emit(
        'update:size',
        `${
          size < initialSizePercentage
            ? initialSizePercentage
            : size > maxSizePercentage
            ? maxSizePercentage
            : size
        }%`
      )
    }
    const teleportAlert = ref()
    const { addDrawerInfo, updateDrawerInfo, removeDrawerInfo } =
      useDrawerInfo()
    addDrawerInfo(usedDialog.bodyId.value, props.direction)
    let drawerDOM: ResizableElement | null = null
    const drawerResizeListener = () => {
      if (props.direction === 'ltr' || props.direction === 'rtl') {
        updateDrawerInfo(
          usedDialog.bodyId.value,
          drawerDOM ? drawerDOM.clientWidth : 0
        )
      } else {
        updateDrawerInfo(
          usedDialog.bodyId.value,
          drawerDOM ? drawerDOM.clientHeight : 0
        )
      }
    }
    onMounted(() => {
      if (slots.footer) {
        teleportAlert.value = useId().value
      }
      overlayDOM = document.querySelector(`#${overlayId}`)
      drawerDOM = document.querySelector(
        `div[aria-describedby="${usedDialog.bodyId.value}"]`
      )
      addResizeListener(drawerDOM!, drawerResizeListener)
    })
    provide('teleportAlert', teleportAlert)
    onUnmounted(() => {
      removeResizeListener(drawerDOM!, drawerResizeListener)
      removeDrawerInfo(usedDialog.bodyId.value)
    })

    return {
      ...usedDialog,
      overlayId,
      useColResize,
      afterLeave,
      drawerRef,
      focusStartRef,
      isHorizontal,
      drawerSize,
      ns,
      t,
      teleportAlert,
      isColResize,
      mouseDown,
      mouseUp,
      mouseMove,
    }
  },
})
</script>
