<template>
  <div class="field-preview">
    <input
      v-if="field.type === 'text'"
      type="text"
      :placeholder="field.placeholder"
      :value="field.defaultValue"
      class="preview-input"
      readonly
    />
    <textarea
      v-else-if="field.type === 'textarea'"
      :placeholder="field.placeholder"
      :value="field.defaultValue"
      class="preview-textarea"
      readonly
    ></textarea>
    <input
      v-else-if="field.type === 'number'"
      type="number"
      :placeholder="field.placeholder"
      :value="field.defaultValue"
      class="preview-input"
      readonly
    />
    <div v-else-if="field.type === 'radio'" class="preview-radio-group">
      <label v-for="(opt, i) in field.options" :key="i" class="preview-radio">
        <input type="radio" :name="'preview-radio-' + field.id" :checked="field.defaultValue === opt" disabled />
        <span>{{ opt }}</span>
      </label>
    </div>
    <div v-else-if="field.type === 'checkbox'" class="preview-checkbox-group">
      <label v-for="(opt, i) in field.options" :key="i" class="preview-checkbox">
        <input type="checkbox" :checked="Array.isArray(field.defaultValue) && field.defaultValue.includes(opt)" disabled />
        <span>{{ opt }}</span>
      </label>
    </div>
    <div v-else-if="field.type === 'file'" class="preview-file">
      <div class="file-upload-btn">📁 选择文件</div>
      <span class="file-hint">{{ field.accept || '未限制文件类型' }}</span>
    </div>
    <div v-else-if="field.type === 'object'" class="preview-object">
      <span class="preview-hint" v-if="!field.fields || field.fields.length === 0">📦 空对象容器</span>
      <span class="preview-hint" v-else>📦 包含 {{ field.fields.length }} 个子字段</span>
    </div>
    <div v-else-if="field.type === 'array'" class="preview-array">
      <span class="preview-hint" v-if="!field.itemTemplate">📋 未设置数组项模板</span>
      <span class="preview-hint" v-else>📋 数组项: {{ field.itemTemplate.label }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  field: { type: Object, required: true },
})
</script>

<style scoped>
.field-preview {
  pointer-events: none;
}

.preview-input,
.preview-textarea {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  background: #fff;
  box-sizing: border-box;
}

.preview-textarea {
  min-height: 56px;
  resize: vertical;
}

.preview-radio-group,
.preview-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preview-radio,
.preview-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
  cursor: default;
}

.preview-file {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-upload-btn {
  padding: 5px 12px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
}

.file-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.preview-object,
.preview-array {
  padding: 6px 10px;
  background: #f5f7fa;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
}

.preview-hint {
  font-size: 12px;
  color: #909399;
}
</style>
