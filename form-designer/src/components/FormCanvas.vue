<template>
  <div
    class="form-canvas"
    @dragover.prevent="onDragOver"
    @drop="onDrop"
    @dragleave="onDragLeave"
    :class="{ 'drag-over': isDragOver }"
  >
    <h3 class="canvas-title">表单画布</h3>
    <div v-if="fields.length === 0" class="canvas-empty">
      <div class="empty-icon">📋</div>
      <p>从左侧拖拽控件到此处</p>
    </div>
    <div v-else class="field-list">
      <NestedFieldList
        :fields="fields"
        :selected-id="selectedId"
        :level="0"
        :parent-field-id="null"
        :all-fields="fields"
        @add-field-to-container="handleAddFieldToContainer"
        @remove-field-from-container="handleRemoveFieldFromContainer"
        @select-field="selectField"
        @reorder-in-container="handleReorderInContainer"
        @move-field="handleMoveField"
        @set-array-template="handleSetArrayTemplate"
        @clear-array-template="handleClearArrayTemplate"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NestedFieldList from './NestedFieldList.vue'

const props = defineProps({
  fields: { type: Array, required: true },
  selectedId: { type: String, default: null },
})

const emit = defineEmits([
  'add-field',
  'remove-field',
  'select-field',
  'reorder-field',
  'add-field-to-container',
  'remove-field-from-container',
  'reorder-in-container',
  'move-field',
  'set-array-template',
  'clear-array-template',
])

const isDragOver = ref(false)

function onDragOver(e) {
  isDragOver.value = true
  e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/json') ? 'copy' : 'move'
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e) {
  e.preventDefault()
  isDragOver.value = false

  const jsonData = e.dataTransfer.getData('application/json')
  if (jsonData) {
    try {
      const ctrl = JSON.parse(jsonData)
      if (ctrl.type && ctrl.defaultField) {
        emit('add-field', ctrl, props.fields.length)
      }
    } catch { /* ignore */ }
    return
  }

  const plainData = e.dataTransfer.getData('text/plain')
  if (plainData) {
    try {
      const info = JSON.parse(plainData)
      if (info && info.fromContainerId !== undefined && info.fromContainerId !== null) {
        emit('move-field', info.fromContainerId, info.fromKey, info.fromIndex, null, 'fields', props.fields.length, 'bottom')
      }
    } catch { /* ignore */ }
  }
}

function handleAddFieldToContainer(containerId, containerKey, ctrl, index) {
  emit('add-field-to-container', containerId, containerKey, ctrl, index)
}

function handleRemoveFieldFromContainer(containerId, containerKey, fieldId) {
  emit('remove-field-from-container', containerId, containerKey, fieldId)
}

function handleReorderInContainer(containerId, containerKey, fromIndex, toIndex) {
  emit('reorder-in-container', containerId, containerKey, fromIndex, toIndex)
}

function handleMoveField(fromContainerId, fromKey, fromIndex, toContainerId, toKey, toIndex, position) {
  emit('move-field', fromContainerId, fromKey, fromIndex, toContainerId, toKey, toIndex, position)
}

function handleSetArrayTemplate(arrayFieldId, ctrl) {
  emit('set-array-template', arrayFieldId, ctrl)
}

function handleClearArrayTemplate(arrayFieldId) {
  emit('clear-array-template', arrayFieldId)
}

function selectField(id) {
  emit('select-field', id)
}

function removeField(id) {
  emit('remove-field', id)
}
</script>

<style scoped>
.form-canvas {
  flex: 1;
  background: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  transition: background 0.2s;
}

.form-canvas.drag-over {
  background: #ecf5ff;
}

.canvas-title {
  margin: 0;
  padding: 16px 20px 12px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
}

.canvas-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.canvas-empty p {
  font-size: 14px;
  margin: 0;
}

.field-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
</style>
