<template>
  <div
    class="nested-field-list"
    :class="{ 'drag-over': isDragOver, 'is-nested': level > 0 }"
    @dragover.prevent="onDragOver"
    @drop="onDrop"
    @dragleave="onDragLeave"
  >
    <div v-if="fields.length === 0" class="nested-empty">
      <span>拖拽控件到此处</span>
    </div>
    <transition-group name="nested-field" tag="div" class="field-items">
      <div
        v-for="(field, index) in fields"
        :key="field.id"
        class="field-item-wrapper"
        :style="{ '--nest-level': level }"
      >
        <div
          class="canvas-field"
          :class="{
            selected: selectedId === field.id,
            'drag-target-top': dragTargetIndex === index && dragPosition === 'top',
            'drag-target-bottom': dragTargetIndex === index && dragPosition === 'bottom',
            'drag-target-inner': dragTargetIndex === index && dragPosition === 'inner' && isContainerField(field),
            'is-container': isContainerField(field),
          }"
          draggable="true"
          @dragstart="onFieldDragStart($event, field, index)"
          @dragover.prevent="onFieldDragOver($event, field, index)"
          @drop.prevent.stop="onFieldDrop($event, field, index)"
          @dragend="onFieldDragEnd"
          @click="selectField(field.id)"
        >
          <div class="field-header">
            <span class="field-index">{{ index + 1 }}</span>
            <span class="field-type-badge">{{ getTypeLabel(field.type) }}</span>
            <span v-if="field.required" class="field-required">*</span>
            <button class="field-delete" @click.stop="removeField(field.id)" title="删除">✕</button>
          </div>
          <div class="field-body">
            <label class="field-label">{{ field.label }}</label>
            <FieldPreview :field="field" />
            <div v-if="field.conditionalDisplay && field.conditionalDisplay.enabled" class="field-condition-hint">
              🔗 依赖「{{ getDependsOnLabel(field) }}」{{ getConditionText(field.conditionalDisplay) }}
            </div>
          </div>

          <div v-if="isContainerField(field)" class="container-content">
            <div v-if="field.type === 'object'" class="object-container">
              <NestedFieldList
                :fields="field.fields"
                :selected-id="selectedId"
                :level="level + 1"
                :parent-field-id="field.id"
                :all-fields="allFields"
                @add-field-to-container="(containerId, containerKey, ctrl, idx) => $emit('add-field-to-container', containerId, containerKey, ctrl, idx)"
                @remove-field-from-container="(containerId, containerKey, id) => $emit('remove-field-from-container', containerId, containerKey, id)"
                @select-field="(id) => $emit('select-field', id)"
                @reorder-in-container="(containerId, containerKey, from, to) => $emit('reorder-in-container', containerId, containerKey, from, to)"
                @move-field="(fromContainerId, fromKey, fromIdx, toContainerId, toKey, toIdx, pos) => $emit('move-field', fromContainerId, fromKey, fromIdx, toContainerId, toKey, toIdx, pos)"
                @set-array-template="(arrayFieldId, ctrl) => $emit('set-array-template', arrayFieldId, ctrl)"
                @clear-array-template="(arrayFieldId) => $emit('clear-array-template', arrayFieldId)"
              />
            </div>
            <div v-else-if="field.type === 'array'" class="array-container">
              <div v-if="field.itemTemplate" class="array-template">
                <div class="template-label">数组项模板:</div>
                <div class="template-field">
                  <div class="template-field-header">
                    <span class="field-type-badge">{{ getTypeLabel(field.itemTemplate.type) }}</span>
                    <button class="field-delete-small" @click.stop="clearArrayTemplate(field.id)" title="清除模板">✕</button>
                  </div>
                  <div class="template-field-body">
                    <label class="field-label">{{ field.itemTemplate.label }}</label>
                    <FieldPreview :field="field.itemTemplate" />
                  </div>
                </div>
              </div>
              <div v-else class="array-template-empty">
                <div
                  class="template-drop-area"
                  @dragover.prevent="onTemplateDragOver"
                  @drop="onTemplateDrop($event, field)"
                  @dragleave="onTemplateDragLeave"
                  :class="{ 'drag-over': templateDragOver }"
                >
                  <span>拖拽控件到此处设置数组项模板</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="dragTargetIndex === index && dragPosition === 'top'" class="drop-indicator drop-indicator-top"></div>
          <div v-if="dragTargetIndex === index && dragPosition === 'bottom'" class="drop-indicator drop-indicator-bottom"></div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import FieldPreview from './FieldPreview.vue'

const props = defineProps({
  fields: { type: Array, required: true },
  selectedId: { type: String, default: null },
  level: { type: Number, default: 0 },
  parentFieldId: { type: String, default: null },
  allFields: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'add-field-to-container',
  'remove-field-from-container',
  'select-field',
  'reorder-in-container',
  'move-field',
  'set-array-template',
  'clear-array-template',
])

const isDragOver = ref(false)
const dragTargetIndex = ref(null)
const dragPosition = ref(null)
const templateDragOver = ref(false)

const typeLabels = {
  text: '单行文本',
  textarea: '多行文本',
  number: '数字',
  radio: '单选按钮组',
  checkbox: '复选框组',
  file: '文件上传',
  object: '对象容器',
  array: '数组列表',
}

const conditionLabels = {
  equals: '等于',
  notEquals: '不等于',
  contains: '包含',
  notContains: '不包含',
  isEmpty: '为空',
  isNotEmpty: '不为空',
}

function isContainerField(field) {
  return field.type === 'object' || field.type === 'array'
}

function getTypeLabel(type) {
  return typeLabels[type] || type
}

function getDependsOnLabel(field) {
  if (!field.conditionalDisplay || !field.conditionalDisplay.dependsOn) return '未设置'
  const allFields = props.allFields.length > 0 ? props.allFields : props.fields
  const dep = findFieldById(allFields, field.conditionalDisplay.dependsOn)
  return dep ? dep.label : '（字段已删除）'
}

function findFieldById(fields, id) {
  for (const f of fields) {
    if (f.id === id) return f
    if (f.fields && f.fields.length) {
      const found = findFieldById(f.fields, id)
      if (found) return found
    }
  }
  return null
}

function getConditionText(cd) {
  const label = conditionLabels[cd.condition] || cd.condition
  if (cd.condition === 'isEmpty' || cd.condition === 'isNotEmpty') {
    return label
  }
  return `${label}「${cd.value}」`
}

function parseMoveInfo(e) {
  const plainData = e.dataTransfer.getData('text/plain')
  if (!plainData) return null
  try {
    const info = JSON.parse(plainData)
    if (info && info.fromContainerId !== undefined && info.fromIndex !== undefined) {
      return info
    }
  } catch { /* ignore */ }
  return null
}

function parseNewControl(e) {
  const jsonData = e.dataTransfer.getData('application/json')
  if (!jsonData) return null
  try {
    const ctrl = JSON.parse(jsonData)
    if (ctrl && ctrl.type && ctrl.defaultField) {
      return ctrl
    }
  } catch { /* ignore */ }
  return null
}

function onDragOver(e) {
  isDragOver.value = true
  e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/json') ? 'copy' : 'move'
}

function onDragLeave() {
  isDragOver.value = false
  dragTargetIndex.value = null
  dragPosition.value = null
}

function onDrop(e) {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false
  dragTargetIndex.value = null
  dragPosition.value = null

  const ctrl = parseNewControl(e)
  if (ctrl) {
    emit('add-field-to-container', props.parentFieldId, 'fields', ctrl, props.fields.length)
    return
  }

  const info = parseMoveInfo(e)
  if (info && info.fromContainerId !== props.parentFieldId) {
    emit('move-field', info.fromContainerId, info.fromKey, info.fromIndex, props.parentFieldId, 'fields', props.fields.length, 'bottom')
  }
}

function onFieldDragStart(e, field, index) {
  const dragData = {
    fieldId: field.id,
    fromContainerId: props.parentFieldId,
    fromKey: 'fields',
    fromIndex: index,
  }
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  e.dataTransfer.effectAllowed = 'move'
}

function onFieldDragOver(e, field, index) {
  const rect = e.currentTarget.getBoundingClientRect()
  const y = e.clientY - rect.top
  const height = rect.height

  const canDropInner = field.type === 'object' || (field.type === 'array' && !field.itemTemplate)
  
  if (canDropInner && y > height * 0.3 && y < height * 0.7) {
    dragPosition.value = 'inner'
  } else if (y < height / 2) {
    dragPosition.value = 'top'
  } else {
    dragPosition.value = 'bottom'
  }

  dragTargetIndex.value = index
  e.dataTransfer.dropEffect = 'move'
}

function onFieldDrop(e, field, index) {
  e.preventDefault()
  e.stopPropagation()
  dragTargetIndex.value = null

  const ctrl = parseNewControl(e)
  if (ctrl) {
    if (dragPosition.value === 'inner' && field.type === 'object') {
      emit('add-field-to-container', field.id, 'fields', ctrl, field.fields.length)
    } else if (dragPosition.value === 'inner' && field.type === 'array' && !field.itemTemplate) {
      emit('set-array-template', field.id, ctrl)
    } else {
      const insertIdx = dragPosition.value === 'bottom' ? index + 1 : index
      emit('add-field-to-container', props.parentFieldId, 'fields', ctrl, insertIdx)
    }
    dragPosition.value = null
    return
  }

  const info = parseMoveInfo(e)
  if (!info) {
    dragPosition.value = null
    return
  }

  const isSameContainer = info.fromContainerId === props.parentFieldId

  if (isSameContainer) {
    if (dragPosition.value === 'inner' && field.type === 'object') {
      emit('move-field', info.fromContainerId, info.fromKey, info.fromIndex, field.id, 'fields', 0, 'inner')
    } else {
      const toIdx = dragPosition.value === 'bottom' ? index + 1 : index
      if (info.fromIndex !== toIdx) {
        emit('reorder-in-container', props.parentFieldId, 'fields', info.fromIndex, toIdx)
      }
    }
  } else {
    if (dragPosition.value === 'inner' && field.type === 'object') {
      emit('move-field', info.fromContainerId, info.fromKey, info.fromIndex, field.id, 'fields', 0, 'inner')
    } else {
      const toIdx = dragPosition.value === 'bottom' ? index + 1 : index
      emit('move-field', info.fromContainerId, info.fromKey, info.fromIndex, props.parentFieldId, 'fields', toIdx, dragPosition.value)
    }
  }

  dragPosition.value = null
}

function onFieldDragEnd() {
  dragTargetIndex.value = null
  dragPosition.value = null
  templateDragOver.value = false
}

function onTemplateDragOver(e) {
  templateDragOver.value = true
  e.dataTransfer.dropEffect = 'copy'
}

function onTemplateDragLeave() {
  templateDragOver.value = false
}

function onTemplateDrop(e, arrayField) {
  e.preventDefault()
  e.stopPropagation()
  templateDragOver.value = false
  dragTargetIndex.value = null
  dragPosition.value = null
  const ctrl = parseNewControl(e)
  if (ctrl) {
    emit('set-array-template', arrayField.id, ctrl)
  }
}

function selectField(id) {
  emit('select-field', id)
}

function removeField(id) {
  emit('remove-field-from-container', props.parentFieldId, 'fields', id)
}

function clearArrayTemplate(fieldId) {
  emit('clear-array-template', fieldId)
}
</script>

<style scoped>
.nested-field-list {
  border: 2px dashed #e4e7ed;
  border-radius: 8px;
  padding: 8px;
  min-height: 60px;
  transition: all 0.2s;
  background: #fafafa;
}

.nested-field-list.is-nested {
  margin-top: 8px;
  margin-left: calc(var(--nest-level, 0) * 12px);
}

.nested-field-list.drag-over {
  border-color: #409eff;
  background: #ecf5ff;
}

.nested-empty {
  text-align: center;
  padding: 20px 10px;
  color: #c0c4cc;
  font-size: 12px;
}

.field-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-item-wrapper {
  position: relative;
}

.canvas-field {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: #fff;
}

.canvas-field:hover {
  border-color: #c0c4cc;
}

.canvas-field.selected {
  border-color: #409eff;
  background: #f0f7ff;
  box-shadow: 0 0 0 1px #409eff;
}

.canvas-field.is-container {
  border-color: #67c23a;
}

.canvas-field.is-container.selected {
  border-color: #409eff;
}

.canvas-field.drag-target-top {
  border-top: 3px solid #409eff;
}

.canvas-field.drag-target-bottom {
  border-bottom: 3px solid #409eff;
}

.canvas-field.drag-target-inner {
  border-color: #67c23a;
  background: #f0f9eb;
}

.field-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.field-index {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e4e7ed;
  color: #909399;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.field-type-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: #ecf5ff;
  color: #409eff;
  font-weight: 500;
}

.field-required {
  color: #f56c6c;
  font-weight: 700;
  font-size: 12px;
}

.field-delete {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #c0c4cc;
  font-size: 12px;
  cursor: pointer;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.field-delete:hover {
  background: #fef0f0;
  color: #f56c6c;
}

.field-body {
  padding-left: 2px;
}

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.field-condition-hint {
  margin-top: 6px;
  font-size: 10px;
  color: #909399;
  padding: 3px 6px;
  background: #f4f4f5;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.container-content {
  margin-top: 8px;
}

.array-template {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 8px;
}

.template-label {
  font-size: 11px;
  color: #909399;
  margin-bottom: 6px;
  font-weight: 500;
}

.template-field {
  background: #fff;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  padding: 8px;
}

.template-field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.field-delete-small {
  border: none;
  background: transparent;
  color: #c0c4cc;
  font-size: 10px;
  cursor: pointer;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.field-delete-small:hover {
  background: #fef0f0;
  color: #f56c6c;
}

.template-field-body .field-label {
  font-size: 11px;
}

.array-template-empty {
  margin-top: 4px;
}

.template-drop-area {
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  padding: 16px;
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
  transition: all 0.2s;
  background: #fafafa;
}

.template-drop-area.drag-over {
  border-color: #67c23a;
  background: #f0f9eb;
  color: #67c23a;
}

.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: #409eff;
  border-radius: 2px;
  z-index: 10;
}

.drop-indicator-top {
  top: -2px;
}

.drop-indicator-bottom {
  bottom: -2px;
}

.nested-field-move,
.nested-field-enter-active,
.nested-field-leave-active {
  transition: all 0.2s ease;
}

.nested-field-enter-from,
.nested-field-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
