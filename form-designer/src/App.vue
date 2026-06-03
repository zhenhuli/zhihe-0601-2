<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">🔧 拖拽式表单设计器</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showPreview = true">预览表单</button>
        <button class="btn btn-secondary" @click="exportJson">导出 JSON</button>
        <button class="btn btn-secondary" @click="exportHtml">导出 HTML 表单</button>
        <button class="btn btn-danger" @click="clearAll">清空</button>
      </div>
    </header>
    <main class="app-main">
      <ControlPalette />
      <FormCanvas
        :fields="fields"
        :selectedId="selectedFieldId"
        @add-field="addField"
        @remove-field="removeField"
        @select-field="selectField"
        @reorder-field="reorderField"
        @add-field-to-container="addFieldToContainer"
        @remove-field-from-container="removeFieldFromContainer"
        @reorder-in-container="reorderInContainer"
        @move-field="moveField"
        @set-array-template="setArrayTemplate"
        @clear-array-template="clearArrayTemplate"
      />
      <PropertyPanel
        :field="selectedField"
        :fields="fields"
        @update-field="updateField"
      />
    </main>
    <FormPreview
      v-if="showPreview"
      :fields="fields"
      @close="showPreview = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ControlPalette from './components/ControlPalette.vue'
import FormCanvas from './components/FormCanvas.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import FormPreview from './components/FormPreview.vue'

let idCounter = 0
function generateId() {
  return 'field_' + Date.now() + '_' + (++idCounter)
}

const fields = ref([])
const selectedFieldId = ref(null)
const showPreview = ref(false)

const selectedField = computed(() => {
  return findFieldById(fields.value, selectedFieldId.value)
})

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

function findContainerAndIndex(fieldList, containerId, containerKey = 'fields') {
  if (containerId === null) {
    return { container: fieldList, isRoot: true }
  }
  for (const f of fieldList) {
    if (f.id === containerId) {
      if (f[containerKey]) {
        return { container: f[containerKey], isRoot: false }
      }
    }
    if (f.fields && f.fields.length) {
      const found = findContainerAndIndex(f.fields, containerId, containerKey)
      if (found) return found
    }
  }
  return null
}

function addField(ctrl, insertIndex) {
  const newField = {
    id: generateId(),
    type: ctrl.type,
    ...JSON.parse(JSON.stringify(ctrl.defaultField)),
  }
  const idx = Math.min(insertIndex, fields.value.length)
  fields.value.splice(idx, 0, newField)
  selectedFieldId.value = newField.id
}

function addFieldToContainer(containerId, containerKey, ctrl, insertIndex) {
  const result = findContainerAndIndex(fields.value, containerId, containerKey)
  if (!result) return

  const newField = {
    id: generateId(),
    type: ctrl.type,
    ...JSON.parse(JSON.stringify(ctrl.defaultField)),
  }
  const container = result.container
  const idx = Math.min(insertIndex, container.length)
  container.splice(idx, 0, newField)
  selectedFieldId.value = newField.id
}

function removeField(id) {
  const idx = fields.value.findIndex(f => f.id === id)
  if (idx !== -1) {
    fields.value.splice(idx, 1)
    if (selectedFieldId.value === id) {
      selectedFieldId.value = fields.value.length > 0 ? fields.value[Math.min(idx, fields.value.length - 1)].id : null
    }
    return
  }
  removeFieldFromContainer(null, 'fields', id)
}

function removeFieldFromContainer(containerId, containerKey, fieldId) {
  const result = findContainerAndIndex(fields.value, containerId, containerKey)
  if (!result) return

  const container = result.container
  const idx = container.findIndex(f => f.id === fieldId)
  if (idx === -1) return

  container.splice(idx, 1)
  if (selectedFieldId.value === fieldId) {
    selectedFieldId.value = container.length > 0 ? container[Math.min(idx, container.length - 1)].id : null
  }
}

function selectField(id) {
  selectedFieldId.value = id
}

function updateField(key, value) {
  const field = findFieldById(fields.value, selectedFieldId.value)
  if (field) {
    field[key] = value
  }
}

function reorderField(fromIndex, toIndex) {
  const item = fields.value.splice(fromIndex, 1)[0]
  fields.value.splice(toIndex, 0, item)
}

function reorderInContainer(containerId, containerKey, fromIndex, toIndex) {
  const result = findContainerAndIndex(fields.value, containerId, containerKey)
  if (!result) return

  const container = result.container
  const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
  const item = container.splice(fromIndex, 1)[0]
  container.splice(adjustedToIndex, 0, item)
}

function moveField(fromContainerId, fromKey, fromIndex, toContainerId, toKey, toIndex, position) {
  const fromResult = findContainerAndIndex(fields.value, fromContainerId, fromKey)
  const toResult = findContainerAndIndex(fields.value, toContainerId, toKey)

  if (!fromResult || !toResult) return

  const fromContainer = fromResult.container
  const toContainer = toResult.container

  if (fromContainer === toContainer) {
    if (fromIndex === toIndex) return
    const item = fromContainer.splice(fromIndex, 1)[0]
    const adjustedIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
    toContainer.splice(adjustedIndex, 0, item)
  } else {
    const item = fromContainer.splice(fromIndex, 1)[0]
    const adjustedIndex = Math.min(toIndex, toContainer.length)
    toContainer.splice(adjustedIndex, 0, item)
  }
}

function setArrayTemplate(arrayFieldId, ctrl) {
  const arrayField = findFieldById(fields.value, arrayFieldId)
  if (!arrayField || arrayField.type !== 'array') return

  arrayField.itemTemplate = {
    id: generateId(),
    type: ctrl.type,
    ...JSON.parse(JSON.stringify(ctrl.defaultField)),
  }
  selectedFieldId.value = arrayFieldId
}

function clearArrayTemplate(arrayFieldId) {
  const arrayField = findFieldById(fields.value, arrayFieldId)
  if (!arrayField || arrayField.type !== 'array') return
  arrayField.itemTemplate = null
}

function convertFieldToSchema(f) {
  const base = {
    type: f.type,
    label: f.label,
    required: f.required,
  }
  if (f.placeholder) base.placeholder = f.placeholder
  if (f.defaultValue !== '' && f.defaultValue !== null && !(Array.isArray(f.defaultValue) && f.defaultValue.length === 0)) {
    base.defaultValue = f.defaultValue
  }
  if (f.type === 'number') {
    if (f.min !== null && f.min !== '') base.min = f.min
    if (f.max !== null && f.max !== '') base.max = f.max
  }
  if (f.type === 'radio' || f.type === 'checkbox') {
    base.options = [...f.options]
  }
  if (f.type === 'file') {
    if (f.accept) base.accept = f.accept
    if (f.maxSize) base.maxSize = f.maxSize
  }
  if (f.conditionalDisplay && f.conditionalDisplay.enabled) {
    base.conditionalDisplay = { ...f.conditionalDisplay }
  }
  if (f.validation && f.validation.pattern) {
    base.validation = { ...f.validation }
  }
  if (f.type === 'object' && f.fields) {
    base.fields = f.fields.map(convertFieldToSchema)
  }
  if (f.type === 'array' && f.itemTemplate) {
    base.itemTemplate = convertFieldToSchema(f.itemTemplate)
  }
  return base
}

function getJsonSchema() {
  return {
    fields: fields.value.map(convertFieldToSchema),
  }
}

function exportJson() {
  const json = JSON.stringify(getJsonSchema(), null, 2)
  downloadFile('form-schema.json', json, 'application/json')
}

function exportHtml() {
  const schema = getJsonSchema()
  const html = generateHtmlForm(schema)
  downloadFile('form.html', html, 'text/html')
}

function generateFieldHtml(f, indent = '    ', namePrefix = '') {
  let html = ''
  const fieldName = namePrefix + f.label
  const reqMark = f.required ? ' <span class="req">*</span>' : ''

  if (f.type === 'object') {
    html += `${indent}<div class="form-group object-group">\n`
    html += `${indent}  <label>${f.label}${reqMark}</label>\n`
    html += `${indent}  <div class="object-content" style="padding-left: 16px; border-left: 2px solid #e4e7ed; margin-top: 8px;">\n`
    if (f.fields) {
      f.fields.forEach(subField => {
        html += generateFieldHtml(subField, indent + '    ', fieldName + '.')
      })
    }
    html += `${indent}  </div>\n`
    html += `${indent}</div>\n`
  } else if (f.type === 'array') {
    html += `${indent}<div class="form-group array-group">\n`
    html += `${indent}  <label>${f.label}${reqMark}</label>\n`
    html += `${indent}  <div class="array-content" style="margin-top: 8px;">\n`
    if (f.itemTemplate) {
      html += `${indent}    <div class="array-item" style="padding: 12px; background: #f5f7fa; border-radius: 6px; margin-bottom: 8px;">\n`
      html += generateFieldHtml({ ...f.itemTemplate, label: '项 1', required: false }, indent + '      ', fieldName + '[0].')
      html += `${indent}    </div>\n`
      html += `${indent}    <div class="array-item" style="padding: 12px; background: #f5f7fa; border-radius: 6px; margin-bottom: 8px;">\n`
      html += generateFieldHtml({ ...f.itemTemplate, label: '项 2', required: false }, indent + '      ', fieldName + '[1].')
      html += `${indent}    </div>\n`
    }
    html += `${indent}  </div>\n`
    html += `${indent}</div>\n`
  } else {
    html += `${indent}<div class="form-group">\n`
    html += `${indent}  <label>${f.label}${reqMark}</label>\n`

    if (f.type === 'text') {
      html += `${indent}  <input type="text" name="${fieldName}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} value="${f.defaultValue || ''}" />\n`
    } else if (f.type === 'textarea') {
      html += `${indent}  <textarea name="${fieldName}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''}>${f.defaultValue || ''}</textarea>\n`
    } else if (f.type === 'number') {
      html += `${indent}  <input type="number" name="${fieldName}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} value="${f.defaultValue || ''}" />\n`
    } else if (f.type === 'radio') {
      html += `${indent}  <div class="radio-group">\n`
      ;(f.options || []).forEach(opt => {
        html += `${indent}    <label><input type="radio" name="${fieldName}" value="${opt}" ${f.defaultValue === opt ? 'checked' : ''} ${f.required ? 'required' : ''} /> ${opt}</label>\n`
      })
      html += `${indent}  </div>\n`
    } else if (f.type === 'checkbox') {
      html += `${indent}  <div class="checkbox-group">\n`
      ;(f.options || []).forEach(opt => {
        const checked = Array.isArray(f.defaultValue) && f.defaultValue.includes(opt) ? 'checked' : ''
        html += `${indent}    <label><input type="checkbox" name="${fieldName}" value="${opt}" ${checked} /> ${opt}</label>\n`
      })
      html += `${indent}  </div>\n`
    } else if (f.type === 'file') {
      html += `${indent}  <input type="file" name="${fieldName}" ${f.accept ? `accept="${f.accept}"` : ''} ${f.required ? 'required' : ''} />\n`
    }

    html += `${indent}</div>\n`
  }

  return html
}

function generateHtmlForm(schema) {
  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>表单</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; color: #303133; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 14px; }
    .form-group label .req { color: #f56c6c; }
    input[type="text"], input[type="number"], textarea, select { width: 100%; padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
    input:focus, textarea:focus { outline: none; border-color: #409eff; }
    .radio-group, .checkbox-group { display: flex; flex-wrap: wrap; gap: 12px; }
    .radio-group label, .checkbox-group label { display: flex; align-items: center; gap: 4px; font-weight: normal; cursor: pointer; }
    button[type="submit"] { padding: 10px 24px; background: #409eff; color: #fff; border: none; border-radius: 4px; font-size: 15px; cursor: pointer; }
    button[type="submit"]:hover { background: #66b1ff; }
  </style>
</head>
<body>
  <form>\n`

  schema.fields.forEach(f => {
    html += generateFieldHtml(f, '    ', '')
  })

  html += `    <button type="submit">提交</button>\n`
  html += `  </form>\n</body>\n</html>`

  return html
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function clearAll() {
  fields.value = []
  selectedFieldId.value = null
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: #f0f2f5;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.app-title {
  font-size: 17px;
  font-weight: 700;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 7px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #ecf5ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.btn-secondary:hover {
  background: #409eff;
  color: #fff;
}

.btn-primary {
  background: #409eff;
  color: #fff;
  border: 1px solid #409eff;
}

.btn-primary:hover {
  background: #66b1ff;
  border-color: #66b1ff;
}

.btn-danger {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.btn-danger:hover {
  background: #f56c6c;
  color: #fff;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
