<template>
  <form :class="formClasses">
    <slot />
    <teleport
      v-if="alertVisible && keepAlive"
      :to="teleportSelector ?? teleportAlertId"
      :disabled="!teleportSelector && !teleportAlertId"
    >
      <el-alert
        v-model:visible="alertVisible"
        type="error"
        :title="alertTitle"
      />
    </teleport>
  </form>
</template>

<script lang="ts" setup>
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  provide,
  reactive,
  ref,
  toRef,
  toRefs,
  watch,
} from 'vue'
import { debugWarn, isFunction } from '@element-plus/utils'
import { formContextKey } from '@element-plus/tokens'
import { useNamespace, useSize } from '@element-plus/hooks'
import ElAlert from '@element-plus/components/alert'
import { formEmits, formProps } from './form'
import { filterFields, useFormLabelWidth } from './utils'

import type { ValidateFieldsError } from 'async-validator'
import type { Arrayable } from '@element-plus/utils'
import type {
  FormContext,
  FormItemContext,
  FormValidateCallback,
  FormValidationResult,
} from '@element-plus/tokens'
import type { FormItemProp } from './form-item'

const COMPONENT_NAME = 'ElForm'
defineOptions({
  name: 'ElForm',
})
const props = defineProps(formProps)
const emit = defineEmits(formEmits)

const verifySingle = toRef(props, 'verifySingle')
const keepAlive = ref(true)
onActivated(() => {
  keepAlive.value = true
})
onDeactivated(() => {
  keepAlive.value = false
})
const fields: FormItemContext[] = []

const formSize = useSize()
const ns = useNamespace('form')
const formClasses = computed(() => {
  const { labelPosition, inline } = props
  return [
    ns.b(),
    // todo: in v2.2.0, we can remove default
    // in fact, remove it doesn't affect the final style
    ns.m(formSize.value || 'default'),
    {
      [ns.m(`label-${labelPosition}`)]: labelPosition,
      [ns.m('inline')]: inline,
    },
  ]
})

const addField: FormContext['addField'] = (field) => {
  fields.push(field)
}

const removeField: FormContext['removeField'] = (field) => {
  if (field.prop) {
    fields.splice(fields.indexOf(field), 1)
  }
}

const resetFields: FormContext['resetFields'] = (properties = []) => {
  alertVisible.value = false
  if (!props.model) {
    debugWarn(COMPONENT_NAME, 'model is required for resetFields to work.')
    return
  }
  filterFields(fields, properties).forEach((field) => field.resetField())
}

const clearValidate: FormContext['clearValidate'] = (props = []) => {
  filterFields(fields, props).forEach((field) => field.clearValidate())
}

const isValidatable = computed(() => {
  const hasModel = !!props.model
  if (!hasModel) {
    debugWarn(COMPONENT_NAME, 'model is required for validate to work.')
  }
  return hasModel
})

const obtainValidateFields = (props: Arrayable<FormItemProp>) => {
  if (fields.length === 0) return []

  const filteredFields = filterFields(fields, props)
  if (!filteredFields.length) {
    debugWarn(COMPONENT_NAME, 'please pass correct props!')
    return []
  }
  return filteredFields
}

const validate = async (
  callback?: FormValidateCallback
): FormValidationResult => validateField(undefined, callback)
const alertVisible = ref(false)
const alertTitle = ref<string | undefined>('')

const doValidateField = async (
  props: Arrayable<FormItemProp> = []
): Promise<boolean> => {
  if (!isValidatable.value) return false

  const fields = obtainValidateFields(props)
  if (fields.length === 0) return true

  let validationErrors: ValidateFieldsError = {}
  let fieldIndex = 0
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    try {
      await field.validate('')
      alertVisible.value = false
    } catch (fields) {
      validationErrors = {
        ...validationErrors,
        ...(fields as ValidateFieldsError),
      }
      if (verifySingle.value) {
        fieldIndex = i
        alertVisible.value = true
        for (const key in fields as ValidateFieldsError) {
          alertTitle.value = (fields as ValidateFieldsError)[key][0].message
        }
        break
      }
    }
  }
  for (const field of fields.slice(fieldIndex + 1)) {
    field.clearValidate()
  }

  if (Object.keys(validationErrors).length === 0) return true
  return Promise.reject(validationErrors)
}

const validateField: FormContext['validateField'] = async (
  modelProps = [],
  callback
) => {
  const shouldThrow = !isFunction(callback)
  try {
    const result = await doValidateField(modelProps)
    // When result is false meaning that the fields are not validatable
    if (result === true) {
      callback?.(result)
    }
    return result
  } catch (e) {
    const invalidFields = e as ValidateFieldsError

    if (props.scrollToError) {
      scrollToField(Object.keys(invalidFields)[0])
    }
    callback?.(false, invalidFields)
    return shouldThrow && Promise.reject(invalidFields)
  }
}

const scrollToField = (prop: FormItemProp) => {
  const field = filterFields(fields, prop)[0]
  if (field) {
    field.$el?.scrollIntoView()
  }
}

watch(
  () => props.rules,
  () => {
    if (props.validateOnRuleChange) {
      validate().catch((err) => debugWarn(err))
    }
  },
  { deep: true }
)

provide(
  formContextKey,
  reactive({
    ...toRefs(props),
    emit,

    resetFields,
    clearValidate,
    validateField,
    addField,
    removeField,

    ...useFormLabelWidth(),
  })
)

const teleportAlert = inject('teleportAlert', ref())
const teleportAlertId = ref(
  teleportAlert.value ? `#${teleportAlert.value}` : undefined
)

defineExpose({
  /** @description validate form */
  validate,
  /** @description validate form field */
  validateField,
  /** @description reset fields */
  resetFields,
  /** @description clear validation status */
  clearValidate,
  /** @description scroll to field */
  scrollToField,
})
</script>
