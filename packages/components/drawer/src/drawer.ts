import { buildProps } from '@element-plus/utils'
import { dialogEmits, dialogProps } from '@element-plus/components/dialog'
import type { ExtractPropTypes } from 'vue'

export const drawerProps = buildProps({
  ...dialogProps,
  direction: {
    type: String,
    default: 'rtl',
    values: ['ltr', 'rtl', 'ttb', 'btt'],
  },
  size: {
    type: [String, Number],
    default: '30%',
  },
  withHeader: {
    type: Boolean,
    default: true,
  },
  modalFade: {
    type: Boolean,
    default: true,
  },
  teleportSelector: {
    type: String,
    default: 'body',
  },
  appendToSelector: {
    type: Boolean,
    default: false,
  },
  disabledScrollbar: {
    type: Boolean,
    default: false,
  },
} as const)

export type DrawerProps = ExtractPropTypes<typeof drawerProps>

export const drawerEmits = dialogEmits
