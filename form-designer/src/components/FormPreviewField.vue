<template>
  <div v-if="isFieldVisible(field)" class="preview-field" :class="{ 'is-object': field.type === 'object', 'is-array': field.type === 'array' }">
    <label class="preview-label">
      {{ field.label }}
      <span v-if="field.required" class="preview-required">*</span>
    </label>

    <input
      v-if="field.type === 'text'"
      type="text"
      class="preview-input"
      :class="{ 'has-error': getValidationError(field) }"
      :placeholder="field.placeholder || ''"
      :value="formData[fieldKey]"
      @input="onTextInput($event, field)"
      @blur="touchField(field.id)"
    />
    <textarea
      v-else-if="field.type === 'textarea'"
      class="preview-input preview-textarea"
      :class="{ 'has-error': getValidationError(field) }"
      :placeholder="field.placeholder || ''"
      :value="formData[fieldKey]"
      @input="onTextInput($event, field)"
      @blur="touchField(field.id)"
    ></textarea>
    <input
      v-else-if="field.type === 'number'"
      type="number"
      class="preview-input"
      :class="{ 'has-error': getValidationError(field) }"
      :placeholder="field.placeholder || ''"
      :value="formData[fieldKey]"
      @input="onNumberInput($event, field)"
      @blur="touchField(field.id)"
    />
    <div v-else-if="field.type === 'radio'" class="preview-radio-group">
      <label v-for="(opt, i) in field.options" :key="i" class="preview-radio">
        <input
          type="radio"
          :name="'preview-' + fieldKey"
          :value="opt"
          :checked="formData[fieldKey] === opt"
          @change="onRadioChange(field, opt)"
        />
        <span>{{ opt }}</span>
      </label>
    </div>
    <div v-else-if="field.type === 'checkbox'" class="preview-checkbox-group">
      <label v-for="(opt, i) in field.options" :key="i" class="preview-checkbox">
        <input
          type="checkbox"
          :value="opt"
          :checked="Array.isArray(formData[fieldKey]) && formData[fieldKey].includes(opt)"
          @change="onCheckboxChange(field, opt, $event)"
        />
        <span>{{ opt }}</span>
      </label>
    </div>
    <div v-else-if="field.type === 'file'" class="preview-file">
      <input
        type="file"
        :accept="field.accept || ''"
        @change="onFileChange(field.id, $event)"
      />
      <span v-if="field.maxSize" class="file-size-hint">最大 {{ field.maxSize }}</span>
    </div>

    <div v-else-if="field.type === 'object'" class="preview-object-content">
      <div class="preview-object-fields">
        <FormPreviewField
          v-for="subField in field.fields"
          :key="subField.id"
          :field="subField"
          :field-key="fieldKey + '.' + subField.id"
          :parent-visible="isFieldVisible(field)"
          :form-data="formData"
          :touched-fields="touchedFields"
          :validation-errors="validationErrors"
          :all-fields="allFields"
          @input="onSubFieldInput"
          @touch="touchField"
        />
      </div>
    </div>

    <div v-else-if="field.type === 'array'" class="preview-array-content">
      <div v-if="field.itemTemplate" class="preview-array-items">
        <div
          v-for="(item, idx) in arrayItems"
          :key="idx"
          class="preview-array-item"
        >
          <div class="array-item-header">
            <span class="array-item-index">项 {{ idx + 1 }}</span>
            <button
              v-if="arrayItems.length > 1"
              type="button"
              class="array-item-delete"
              @click="removeArrayItem(idx)"
            >删除</button>
          </div>
          <div class="array-item-content">
            <FormPreviewField
              :field="{ ...field.itemTemplate, required: false, label: '' }"
              :field-key="fieldKey + '[' + idx + ']'"
              :parent-visible="isFieldVisible(field)"
              :form-data="formData"
              :touched-fields="touchedFields"
              :validation-errors="validationErrors"
              :all-fields="allFields"
              @input="onSubFieldInput"
              @touch="touchField"
            />
          </div>
        </div>
        <button type="button" class="array-add-btn" @click="addArrayItem">
          + 添加一项
        </button>
      </div>
      <div v-else class="preview-array-empty">
        未设置数组项模板
      </div>
    </div>

    <transition name="error-fade">
      <div v-if="getValidationError(field)" class="preview-error">
        {{ getValidationError(field) }}
      </div>
    </transition>

    <div v-if="field.conditionalDisplay && field.conditionalDisplay.enabled" class="preview-condition-hint">
      🔗 条件显示：当「{{ getDependsOnLabel(field) }}」{{ conditionLabel(field.conditionalDisplay.condition) }}{{ field.conditionalDisplay.condition !== 'isEmpty' && field.conditionalDisplay.condition !== 'isNotEmpty' ? '「' + field.conditionalDisplay.value + '」' : '' }}时显示
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'

const props = defineProps({
  field: { type: Object, required: true },
  fieldKey: { type: String, required: true },
  parentVisible: { type: Boolean, default: true },
  formData: { type: Object, required: true },
  touchedFields: { type: Object, required: true },
  validationErrors: { type: Object, required: true },
  allFields: { type: Array, required: true },
})

const emit = defineEmits(['input', 'touch'])

const conditionLabels = {
  equals: '等于',
  notEquals: '不等于',
  contains: '包含',
  notContains: '不包含',
  isEmpty: '为空',
  isNotEmpty: '不为空',
}

const arrayItems = ref([{ id: 0 }])

watch(
  () => props.field.itemTemplate,
  () => {
    if (props.field.type === 'array' && props.field.itemTemplate) {
      if (!(props.fieldKey in props.formData)) {
        props.formData[props.fieldKey] = []
      }
      if (!Array.isArray(props.formData[props.fieldKey])) {
        props.formData[props.fieldKey] = []
      }
      while (arrayItems.value.length < props.formData[props.fieldKey].length + 1) {
        arrayItems.value.push({ id: arrayItems.value.length })
      }
    }
  },
  { immediate: true }
)

function conditionLabel(cond) {
  return conditionLabels[cond] || cond
}

function getDependsOnLabel(field) {
  if (!field.conditionalDisplay || !field.conditionalDisplay.dependsOn) return ''
  const dep = findFieldById(props.allFields, field.conditionalDisplay.dependsOn)
  return dep ? dep.label : ''
}

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

function getDependsOnValue(dependsOnId) {
  const val = props.formData[dependsOnId]
  if (Array.isArray(val)) return val
  return val != null ? String(val) : ''
}

function isFieldVisible(field) {
  if (!props.parentVisible) return false
  const cd = field.conditionalDisplay
  if (!cd || !cd.enabled || !cd.dependsOn) return true

  const depValue = getDependsOnValue(cd.dependsOn)
  const condValue = cd.value || ''

  switch (cd.condition) {
    case 'equals':
      return depValue === condValue
    case 'notEquals':
      return depValue !== condValue
    case 'contains':
      return depValue.includes(condValue)
    case 'notContains':
      return !depValue.includes(condValue)
    case 'isEmpty':
      return depValue === '' || (Array.isArray(depValue) && depValue.length === 0)
    case 'isNotEmpty':
      return depValue !== '' && !(Array.isArray(depValue) && depValue.length === 0)
    default:
      return true
  }
}

function touchField(fieldId) {
  props.touchedFields.add(fieldId)
  emit('touch', fieldId)
}

function onTextInput(e, field) {
  props.formData[props.fieldKey] = e.target.value
  emit('input', field)
}

function onNumberInput(e, field) {
  props.formData[props.fieldKey] = e.target.value
  emit('input', field)
}

function onRadioChange(field, opt) {
  props.formData[props.fieldKey] = opt
  emit('input', field)
}

function onCheckboxChange(field, opt, e) {
  const current = Array.isArray(props.formData[props.fieldKey]) ? [...props.formData[props.fieldKey]] : []
  if (e.target.checked) {
    if (!current.includes(opt)) current.push(opt)
  } else {
    const idx = current.indexOf(opt)
    if (idx > -1) current.splice(idx, 1)
  }
  props.formData[props.fieldKey] = current
  emit('input', field)
}

function onFileChange(fieldId, event) {
  const file = event.target.files[0]
  props.formData[props.fieldKey] = file ? file.name : ''
  props.touchedFields.add(fieldId)
}

function onSubFieldInput(subField) {
  emit('input', subField)
}

function getValidationError(field) {
  if (!props.touchedFields.has(field.id)) return null
  return props.validationErrors[field.id] || null
}

function addArrayItem() {
  arrayItems.value.push({ id: arrayItems.value.length })
  if (!Array.isArray(props.formData[props.fieldKey])) {
    props.formData[props.fieldKey] = []
  }
}

function removeArrayItem(idx) {
  arrayItems.value.splice(idx, 1)
  if (Array.isArray(props.formData[props.fieldKey])) {
    props.formData[props.fieldKey].splice(idx, 1)
  }
}
</script>

<style scoped>
.preview-field {
  transition: all 0.3s ease;
}

.preview-field.is-object {
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
}

.preview-field.is-array {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
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

.preview-object-content {
  margin-top: 8px;
}

.preview-object-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-left: 8px;
  border-left: 2px solid #dcdfe6;
}

.preview-array-content {
  margin-top: 8px;
}

.preview-array-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-array-item {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
}

.array-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.array-item-index {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
}

.array-item-delete {
  padding: 4px 10px;
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.array-item-delete:hover {
  background: #f56c6c;
  color: #fff;
}

.array-add-btn {
  width: 100%;
  padding: 10px;
  background: #ecf5ff;
  color: #409eff;
  border: 1px dashed #b3d8ff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.array-add-btn:hover {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.preview-array-empty {
  padding: 16px;
  text-align: center;
  color: #c0c4cc;
  font-size: 13px;
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
