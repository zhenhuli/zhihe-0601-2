<template>
  <div class="preview-overlay" @click.self="$emit('close')">
    <div class="preview-modal">
      <div class="preview-header">
        <h2 class="preview-title">表单预览</h2>
        <button class="preview-close" @click="$emit('close')">✕</button>
      </div>
      <div class="preview-body">
        <div v-if="fields.length === 0" class="preview-empty">
          <p>暂无表单字段</p>
        </div>
        <form v-else class="preview-form" @submit.prevent="handleSubmit">
          <transition-group name="field-fade" tag="div" class="preview-fields">
            <FormPreviewField
              v-for="field in fields"
              :key="field.id"
              :field="field"
              :field-key="field.id"
              :parent-visible="true"
              :form-data="formData"
              :touched-fields="touchedFields"
              :validation-errors="validationErrors"
              :all-fields="fields"
              @input="onInput"
              @touch="touchField"
            />
          </transition-group>

          <button type="submit" class="preview-submit-btn">提交</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import FormPreviewField from './FormPreviewField.vue'

const props = defineProps({
  fields: { type: Array, required: true },
})

defineEmits(['close'])

const formData = reactive({})
const touchedFields = reactive(new Set())
const validationErrors = reactive({})

function initializeFieldData(fieldList) {
  fieldList.forEach(f => {
    if (f.type === 'object' && f.fields) {
      initializeFieldData(f.fields)
    } else if (f.type === 'array') {
      formData[f.id] = []
    } else if (!(f.id in formData)) {
      if (f.type === 'checkbox') {
        formData[f.id] = Array.isArray(f.defaultValue) ? [...f.defaultValue] : []
      } else {
        formData[f.id] = f.defaultValue ?? ''
      }
    }
  })
}

watch(
  () => props.fields,
  (newFields) => {
    initializeFieldData(newFields)
  },
  { immediate: true, deep: true }
)

function findFieldById(fieldList, id) {
  for (const f of fieldList) {
    if (f.id === id) return f
    if (f.fields && f.fields.length) {
      const found = findFieldById(f.fields, id)
      if (found) return found
    }
  }
  return null
}

function touchField(fieldId) {
  touchedFields.add(fieldId)
  const field = findFieldById(props.fields, fieldId)
  if (field) validateField(field)
}

function onInput(field) {
  touchedFields.add(field.id)
  validateField(field)
}

function validateField(field) {
  const val = formData[field.id]
  const errors = []

  if (field.type === 'object' || field.type === 'array') {
    return
  }

  if (field.required) {
    if (field.type === 'checkbox') {
      if (!Array.isArray(val) || val.length === 0) {
        errors.push('此字段为必填项')
      }
    } else if (val === '' || val === null || val === undefined) {
      errors.push('此字段为必填项')
    }
  }

  if ((field.type === 'text' || field.type === 'textarea') && field.validation && field.validation.pattern && val) {
    try {
      const regex = new RegExp(field.validation.pattern)
      if (!regex.test(String(val))) {
        errors.push(field.validation.message || '格式不正确')
      }
    } catch {
      errors.push('正则表达式语法错误')
    }
  }

  if (field.type === 'number' && val !== '' && val !== null) {
    const num = Number(val)
    if (field.min !== null && field.min !== '' && num < Number(field.min)) {
      errors.push(`不能小于 ${field.min}`)
    }
    if (field.max !== null && field.max !== '' && num > Number(field.max)) {
      errors.push(`不能大于 ${field.max}`)
    }
  }

  if (errors.length > 0) {
    validationErrors[field.id] = errors[0]
  } else {
    delete validationErrors[field.id]
  }
}

function validateAllFields(fieldList) {
  let hasError = false
  fieldList.forEach(f => {
    if (f.type === 'object' && f.fields) {
      if (validateAllFields(f.fields)) hasError = true
    } else {
      touchedFields.add(f.id)
      validateField(f)
      if (validationErrors[f.id]) hasError = true
    }
  })
  return hasError
}

function collectFormData(fieldList, result = {}, prefix = '') {
  fieldList.forEach(f => {
    const key = prefix + f.label
    if (f.type === 'object' && f.fields) {
      result[f.label] = {}
      collectFormData(f.fields, result[f.label], '')
    } else if (f.type === 'array') {
      result[f.label] = formData[f.id] || []
    } else {
      result[f.label] = formData[f.id]
    }
  })
  return result
}

function handleSubmit() {
  const hasError = validateAllFields(props.fields)

  if (hasError) {
    alert('请修正表单中的错误后再提交')
    return
  }

  const result = collectFormData(props.fields)
  alert('提交成功！\n\n' + JSON.stringify(result, null, 2))
}
</script>

<style scoped>
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.preview-modal {
  width: 640px;
  max-width: 90vw;
  max-height: 85vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
}

.preview-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.preview-close {
  border: none;
  background: transparent;
  font-size: 18px;
  color: #909399;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.preview-close:hover {
  background: #f5f7fa;
  color: #303133;
}

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.preview-empty {
  text-align: center;
  color: #c0c4cc;
  padding: 40px 0;
  font-size: 14px;
}

.preview-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-field {
  transition: all 0.3s ease;
}

.preview-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.preview-required {
  color: #f56c6c;
  margin-left: 2px;
}

.preview-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  color: #303133;
  background: #fff;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.preview-input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15);
}

.preview-input.has-error {
  border-color: #f56c6c;
}

.preview-input.has-error:focus {
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.15);
}

.preview-textarea {
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

.preview-radio-group,
.preview-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.preview-radio,
.preview-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
}

.preview-file {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-size-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.preview-error {
  margin-top: 6px;
  font-size: 12px;
  color: #f56c6c;
  display: flex;
  align-items: center;
  gap: 4px;
}

.preview-error::before {
  content: '⚠';
  font-size: 12px;
}

.preview-condition-hint {
  margin-top: 6px;
  font-size: 11px;
  color: #909399;
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  display: inline-block;
}

.preview-submit-btn {
  padding: 12px 32px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  align-self: flex-start;
}

.preview-submit-btn:hover {
  background: #66b1ff;
}

.field-fade-enter-active,
.field-fade-leave-active {
  transition: all 0.3s ease;
}

.field-fade-enter-from,
.field-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.field-fade-enter-to,
.field-fade-leave-from {
  max-height: 200px;
}

.error-fade-enter-active,
.error-fade-leave-active {
  transition: all 0.2s ease;
}

.error-fade-enter-from,
.error-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
