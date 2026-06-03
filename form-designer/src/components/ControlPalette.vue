<template>
  <div class="control-palette">
    <h3 class="palette-title">控件库</h3>
    <div class="control-list">
      <div
        v-for="ctrl in controls"
        :key="ctrl.type"
        class="control-item"
        draggable="true"
        @dragstart="onDragStart($event, ctrl)"
      >
        <span class="control-icon">{{ ctrl.icon }}</span>
        <span class="control-label">{{ ctrl.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const conditionalDisplayDefault = { enabled: false, dependsOn: '', condition: 'equals', value: '' }
const validationDefault = { pattern: '', message: '' }

const controls = [
  { type: 'text', label: '单行文本', icon: '📝', defaultField: { label: '单行文本', placeholder: '请输入', required: false, defaultValue: '', conditionalDisplay: { ...conditionalDisplayDefault }, validation: { ...validationDefault } } },
  { type: 'textarea', label: '多行文本', icon: '📄', defaultField: { label: '多行文本', placeholder: '请输入', required: false, defaultValue: '', conditionalDisplay: { ...conditionalDisplayDefault }, validation: { ...validationDefault } } },
  { type: 'number', label: '数字', icon: '🔢', defaultField: { label: '数字', placeholder: '请输入数字', required: false, defaultValue: '', min: null, max: null, conditionalDisplay: { ...conditionalDisplayDefault } } },
  { type: 'radio', label: '单选按钮组', icon: '🔘', defaultField: { label: '单选按钮组', required: false, defaultValue: '', options: ['选项1', '选项2', '选项3'], conditionalDisplay: { ...conditionalDisplayDefault } } },
  { type: 'checkbox', label: '复选框组', icon: '☑️', defaultField: { label: '复选框组', required: false, defaultValue: [], options: ['选项1', '选项2', '选项3'], conditionalDisplay: { ...conditionalDisplayDefault } } },
  { type: 'file', label: '文件上传', icon: '📁', defaultField: { label: '文件上传', required: false, accept: '', maxSize: '', conditionalDisplay: { ...conditionalDisplayDefault } } },
  { type: 'object', label: '对象容器', icon: '📦', isContainer: true, defaultField: { label: '对象容器', required: false, fields: [], conditionalDisplay: { ...conditionalDisplayDefault } } },
  { type: 'array', label: '数组列表', icon: '📋', isContainer: true, defaultField: { label: '数组列表', required: false, itemTemplate: null, conditionalDisplay: { ...conditionalDisplayDefault } } },
]

function onDragStart(event, ctrl) {
  event.dataTransfer.setData('application/json', JSON.stringify(ctrl))
  event.dataTransfer.effectAllowed = 'copy'
}
</script>

<style scoped>
.control-palette {
  width: 220px;
  min-width: 220px;
  background: #f7f8fa;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.palette-title {
  margin: 0;
  padding: 16px 16px 12px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
}

.control-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s;
  user-select: none;
}

.control-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  transform: translateY(-1px);
}

.control-item:active {
  cursor: grabbing;
  opacity: 0.7;
}

.control-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.control-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}
</style>
