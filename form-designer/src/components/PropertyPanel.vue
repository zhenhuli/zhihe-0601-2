<template>
  <div class="property-panel">
    <div class="panel-section">
      <h3 class="panel-title">属性编辑器</h3>
      <div v-if="!field" class="panel-empty">
        <p>请选择一个表单项</p>
      </div>
      <div v-else class="property-form">
        <div class="prop-group">
          <label class="prop-label">控件类型</label>
          <span class="prop-type-badge">{{ typeLabels[field.type] }}</span>
        </div>

        <div class="prop-group">
          <label class="prop-label">标签名称</label>
          <input
            type="text"
            class="prop-input"
            :value="field.label"
            @input="updateField('label', $event.target.value)"
          />
        </div>

        <div class="prop-group" v-if="hasPlaceholder">
          <label class="prop-label">占位符</label>
          <input
            type="text"
            class="prop-input"
            :value="field.placeholder"
            @input="updateField('placeholder', $event.target.value)"
          />
        </div>

        <div class="prop-group" v-if="field.type === 'text' || field.type === 'textarea'">
          <label class="prop-label">默认值</label>
          <input
            v-if="field.type === 'text'"
            type="text"
            class="prop-input"
            :value="field.defaultValue"
            @input="updateField('defaultValue', $event.target.value)"
          />
          <textarea
            v-else
            class="prop-input prop-textarea"
            :value="field.defaultValue"
            @input="updateField('defaultValue', $event.target.value)"
          ></textarea>
        </div>

        <div class="prop-group" v-if="field.type === 'number'">
          <label class="prop-label">默认值</label>
          <input
            type="number"
            class="prop-input"
            :value="field.defaultValue"
            @input="updateField('defaultValue', $event.target.value)"
          />
        </div>

        <div class="prop-group" v-if="field.type === 'number'">
          <div class="prop-row">
            <div class="prop-half">
              <label class="prop-label">最小值</label>
              <input
                type="number"
                class="prop-input"
                :value="field.min"
                @input="updateField('min', $event.target.value === '' ? null : Number($event.target.value))"
              />
            </div>
            <div class="prop-half">
              <label class="prop-label">最大值</label>
              <input
                type="number"
                class="prop-input"
                :value="field.max"
                @input="updateField('max', $event.target.value === '' ? null : Number($event.target.value))"
              />
            </div>
          </div>
        </div>

        <div class="prop-group" v-if="field.type === 'radio'">
          <label class="prop-label">默认选中</label>
          <select
            class="prop-input"
            :value="field.defaultValue"
            @change="updateField('defaultValue', $event.target.value)"
          >
            <option value="">无</option>
            <option v-for="(opt, i) in field.options" :key="i" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <div class="prop-group" v-if="field.type === 'checkbox'">
          <label class="prop-label">默认选中（逗号分隔）</label>
          <input
            type="text"
            class="prop-input"
            :value="Array.isArray(field.defaultValue) ? field.defaultValue.join(', ') : ''"
            @input="updateField('defaultValue', $event.target.value.split(',').map(s => s.trim()).filter(Boolean))"
          />
        </div>

        <div class="prop-group" v-if="field.type === 'radio' || field.type === 'checkbox'">
          <label class="prop-label">选项列表（每行一个）</label>
          <textarea
            class="prop-input prop-textarea"
            :value="field.options.join('\n')"
            @input="updateField('options', $event.target.value.split('\n').filter(s => s.trim()))"
          ></textarea>
        </div>

        <div class="prop-group" v-if="field.type === 'file'">
          <label class="prop-label">允许文件类型</label>
          <input
            type="text"
            class="prop-input"
            placeholder="如 .pdf,.doc,.png"
            :value="field.accept"
            @input="updateField('accept', $event.target.value)"
          />
        </div>

        <div class="prop-group" v-if="field.type === 'file'">
          <label class="prop-label">最大文件大小</label>
          <input
            type="text"
            class="prop-input"
            placeholder="如 10MB"
            :value="field.maxSize"
            @input="updateField('maxSize', $event.target.value)"
          />
        </div>

        <div class="prop-group prop-group-switch">
          <label class="prop-label">是否必填</label>
          <label class="switch">
            <input
              type="checkbox"
              :checked="field.required"
              @change="updateField('required', $event.target.checked)"
            />
            <span class="switch-slider"></span>
          </label>
        </div>

        <div class="prop-divider"></div>

        <div class="prop-group">
          <label class="prop-label">条件显示</label>
          <label class="switch" style="margin-bottom: 8px;">
            <input
              type="checkbox"
              :checked="field.conditionalDisplay && field.conditionalDisplay.enabled"
              @change="updateConditionalDisplay('enabled', $event.target.checked)"
            />
            <span class="switch-slider"></span>
          </label>
        </div>

        <template v-if="field.conditionalDisplay && field.conditionalDisplay.enabled">
          <div class="prop-group">
            <label class="prop-label">依赖字段</label>
            <select
              class="prop-input"
              :value="field.conditionalDisplay.dependsOn"
              @change="updateConditionalDisplay('dependsOn', $event.target.value)"
            >
              <option value="">请选择依赖字段</option>
              <option
                v-for="f in otherFields"
                :key="f.id"
                :value="f.id"
              >{{ f.label }}</option>
            </select>
          </div>

          <div class="prop-group">
            <label class="prop-label">条件类型</label>
            <select
              class="prop-input"
              :value="field.conditionalDisplay.condition"
              @change="updateConditionalDisplay('condition', $event.target.value)"
            >
              <option value="equals">等于</option>
              <option value="notEquals">不等于</option>
              <option value="contains">包含</option>
              <option value="notContains">不包含</option>
              <option value="isEmpty">为空</option>
              <option value="isNotEmpty">不为空</option>
            </select>
          </div>

          <div class="prop-group" v-if="!['isEmpty', 'isNotEmpty'].includes(field.conditionalDisplay.condition)">
            <label class="prop-label">条件值</label>
            <input
              type="text"
              class="prop-input"
              :value="field.conditionalDisplay.value"
              @input="updateConditionalDisplay('value', $event.target.value)"
              placeholder="满足此值时显示当前字段"
            />
          </div>
        </template>

        <template v-if="field.type === 'text' || field.type === 'textarea'">
          <div class="prop-divider"></div>

          <div class="prop-group">
            <label class="prop-label">正则校验</label>
            <div class="preset-row">
              <button
                v-for="p in presetPatterns"
                :key="p.label"
                class="preset-btn"
                :class="{ active: field.validation && field.validation.pattern === p.pattern }"
                @click="applyPresetPattern(p)"
                type="button"
              >{{ p.label }}</button>
            </div>
          </div>

          <div class="prop-group">
            <label class="prop-label">正则表达式</label>
            <input
              type="text"
              class="prop-input"
              :value="field.validation ? field.validation.pattern : ''"
              @input="updateValidation('pattern', $event.target.value)"
              placeholder="如 ^[a-zA-Z0-9]+$"
            />
          </div>

          <div class="prop-group">
            <label class="prop-label">校验提示信息</label>
            <input
              type="text"
              class="prop-input"
              :value="field.validation ? field.validation.message : ''"
              @input="updateValidation('message', $event.target.value)"
              placeholder="校验不通过时的提示文字"
            />
          </div>
        </template>
      </div>
    </div>

    <div class="panel-section panel-schema">
      <div class="schema-header">
        <h3 class="panel-title">JSON Schema</h3>
        <button class="copy-btn" @click="copyJson" :title="copied ? '已复制' : '复制'" :class="{ copied: copied }">
          {{ copied ? '✅' : '📋' }}
        </button>
      </div>
      <pre class="schema-code"><code>{{ jsonSchema }}</code></pre>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const copied = ref(false)

const props = defineProps({
  field: { type: Object, default: null },
  fields: { type: Array, required: true },
})

const emit = defineEmits(['update-field'])

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

const presetPatterns = [
  { label: '邮箱', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', message: '请输入有效的邮箱地址' },
  { label: '手机号', pattern: '^1[3-9]\\d{9}$', message: '请输入有效的手机号码' },
  { label: '身份证', pattern: '^\\d{17}[\\dXx]$', message: '请输入有效的身份证号' },
  { label: 'URL', pattern: '^https?://.+', message: '请输入有效的URL地址' },
]

const hasPlaceholder = computed(() => {
  return props.field && ['text', 'textarea', 'number'].includes(props.field.type)
})

function flattenFields(fieldList, result = []) {
  fieldList.forEach(f => {
    result.push(f)
    if (f.fields && f.fields.length) {
      flattenFields(f.fields, result)
    }
  })
  return result
}

const otherFields = computed(() => {
  if (!props.field) return []
  const allFields = flattenFields(props.fields, [])
  return allFields.filter(f => f.id !== props.field.id)
})

function updateField(key, value) {
  emit('update-field', key, value)
}

function updateConditionalDisplay(key, value) {
  const cd = { ...(props.field.conditionalDisplay || { enabled: false, dependsOn: '', condition: 'equals', value: '' }) }
  cd[key] = value
  emit('update-field', 'conditionalDisplay', cd)
}

function updateValidation(key, value) {
  const v = { ...(props.field.validation || { pattern: '', message: '' }) }
  v[key] = value
  emit('update-field', 'validation', v)
}

function applyPresetPattern(preset) {
  emit('update-field', 'validation', { pattern: preset.pattern, message: preset.message })
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

const jsonSchema = computed(() => {
  const schema = {
    fields: props.fields.map(convertFieldToSchema),
  }
  return JSON.stringify(schema, null, 2)
})

function copyJson() {
  navigator.clipboard.writeText(jsonSchema.value).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }).catch(() => {})
}
</script>

<style scoped>
.property-panel {
  width: 320px;
  min-width: 320px;
  background: #f7f8fa;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-section {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #e4e7ed;
}

.panel-schema {
  flex: 1;
  min-height: 0;
}

.panel-title {
  margin: 0;
  padding: 14px 16px 10px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.schema-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 12px;
}

.schema-header .panel-title {
  flex: 1;
}

.copy-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.15s;
}

.copy-btn:hover {
  background: #e4e7ed;
}

.copy-btn.copied {
  background: #f0f9eb;
  color: #67c23a;
}

.panel-empty {
  padding: 24px 16px;
  text-align: center;
  color: #c0c4cc;
  font-size: 13px;
}

.property-form {
  padding: 4px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  max-height: 60vh;
}

.prop-divider {
  height: 1px;
  background: #e4e7ed;
  margin: 4px 0;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-btn {
  padding: 4px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  background: #fff;
  color: #606266;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.preset-btn.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.prop-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prop-label {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.prop-type-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
  background: #ecf5ff;
  color: #409eff;
  font-weight: 500;
  display: inline-block;
  width: fit-content;
}

.prop-input {
  padding: 7px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  color: #303133;
  background: #fff;
  outline: none;
  transition: border-color 0.2s;
}

.prop-input:focus {
  border-color: #409eff;
}

.prop-textarea {
  min-height: 60px;
  resize: vertical;
  font-family: inherit;
}

.prop-row {
  display: flex;
  gap: 10px;
}

.prop-half {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prop-group-switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #dcdfe6;
  transition: 0.3s;
  border-radius: 22px;
}

.switch-slider::before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.switch input:checked + .switch-slider {
  background-color: #409eff;
}

.switch input:checked + .switch-slider::before {
  transform: translateX(18px);
}

.schema-code {
  flex: 1;
  margin: 0;
  padding: 12px 16px;
  font-size: 12px;
  line-height: 1.6;
  color: #303133;
  background: #fff;
  overflow: auto;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
