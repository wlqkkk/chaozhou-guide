(function() {
  'use strict';

  // 状态
  const state = {
    data: null,
    points: [],
    categories: [],
    selectedId: null,
    mode: 'select', // 'select' | 'addPoint'
    transform: { x: 0, y: 0, scale: 1 },
    minScale: 0.5,
    maxScale: 4,
    isDraggingMap: false,
    isDraggingPoint: false,
    hasDragged: false,
    draggedPointId: null,
    dragStartX: 0,
    dragStartY: 0,
    startX: 0,
    startY: 0,
    containerWidth: 0,
    containerHeight: 0,
    mapWidth: 0,
    mapHeight: 0
  };

  // DOM 元素
  const els = {
    mapContainer: document.getElementById('mapContainer'),
    mapWrapper: document.getElementById('mapWrapper'),
    mapImage: document.getElementById('mapImage'),
    hotspotsLayer: document.getElementById('hotspotsLayer'),
    editorHint: document.getElementById('editorHint'),
    panelEmpty: document.getElementById('panelEmpty'),
    panelForm: document.getElementById('panelForm'),
    addPointBtn: document.getElementById('addPointBtn'),
    previewBtn: document.getElementById('previewBtn'),
    exportBtn: document.getElementById('exportBtn'),
    fitMapBtn: document.getElementById('fitMapBtn'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    closeExportModal: document.getElementById('closeExportModal'),
    exportModal: document.getElementById('exportModal'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    exportJsBtn: document.getElementById('exportJsBtn'),
    exportPreview: document.getElementById('exportPreview'),
    // 表单字段
    pId: document.getElementById('pId'),
    pTitle: document.getElementById('pTitle'),
    pCategory: document.getElementById('pCategory'),
    pArea: document.getElementById('pArea'),
    pSummary: document.getElementById('pSummary'),
    pStory: document.getElementById('pStory'),
    pX: document.getElementById('pX'),
    pY: document.getElementById('pY'),
    saveBtn: document.getElementById('saveBtn'),
    deleteBtn: document.getElementById('deleteBtn'),
    confirmModal: document.getElementById('confirmModal'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    closeConfirmModal: document.getElementById('closeConfirmModal'),
    cancelConfirmBtn: document.getElementById('cancelConfirmBtn'),
    okConfirmBtn: document.getElementById('okConfirmBtn')
  };

  // 初始化
  function init() {
    console.log('✅ editor.js 已加载 v2');
    loadData();
    console.log('📊 已加载', state.points.length, '个故事点');
    setupEventListeners();
    console.log('🔧 事件监听已绑定');
    setupMapEvents();
    renderCategories();
    renderHotspots();
    fitMapToScreen();

    // 调试：URL 带 export=1 时打开导出弹窗
    if (location.search.includes('export=1')) {
      setTimeout(showExportModal, 1500);
    }
  }

  // 加载数据
  function loadData() {
    if (typeof GUIDE_DATA !== 'undefined') {
      state.data = JSON.parse(JSON.stringify(GUIDE_DATA));
    } else {
      state.data = {
        hotel: { name: '潮州古城有熊酒店', nameEn: '', description: '', totalPoints: 0 },
        categories: [
          { id: 'history', name: '历史人文', color: '#8B4513' },
          { id: 'architecture', name: '建筑空间', color: '#556B2F' },
          { id: 'craft', name: '传统工艺', color: '#B8860B' },
          { id: 'art', name: '艺术作品', color: '#4682B4' },
          { id: 'furniture', name: '设计家具', color: '#708090' },
          { id: 'tea', name: '茶文化', color: '#2E8B57' }
        ],
        points: [],
        routes: []
      };
    }
    state.points = state.data.points;
    state.categories = state.data.categories;
    updateTotalCount();
  }

  // 更新总数
  function updateTotalCount() {
    state.data.hotel.totalPoints = state.points.length;
  }

  // 渲染分类下拉框
  function renderCategories() {
    els.pCategory.innerHTML = '';
    state.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      els.pCategory.appendChild(option);
    });
  }

  // 渲染热点
  function renderHotspots() {
    els.hotspotsLayer.innerHTML = '';
    state.points.forEach(point => {
      const hotspot = document.createElement('div');
      hotspot.className = 'edit-hotspot' + (point.id === state.selectedId ? ' selected' : '');
      hotspot.dataset.id = point.id;
      hotspot.style.left = (point.x * 100) + '%';
      hotspot.style.top = (point.y * 100) + '%';

      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.backgroundColor = getCategoryColor(point.category);

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = point.title;

      hotspot.appendChild(dot);
      hotspot.appendChild(label);

      hotspot.addEventListener('mousedown', (e) => startDragPoint(e, point.id));
      hotspot.addEventListener('touchstart', (e) => startDragPoint(e, point.id), { passive: false });
      hotspot.addEventListener('click', (e) => {
        if (state.hasDragged) return;
        e.stopPropagation();
        selectPoint(point.id);
      });

      els.hotspotsLayer.appendChild(hotspot);
    });
  }

  // 获取分类颜色
  function getCategoryColor(categoryId) {
    const cat = state.categories.find(c => c.id === categoryId);
    return cat ? cat.color : '#c9a86c';
  }

  // 获取分类名称
  function getCategoryName(categoryId) {
    const cat = state.categories.find(c => c.id === categoryId);
    return cat ? cat.name : '';
  }

  // 生成新 ID
  function generateId() {
    const nums = state.points.map(p => parseInt(p.id.replace('p', ''), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return 'p' + String(max + 1).padStart(2, '0');
  }

  // 选择点
  function selectPoint(id) {
    state.selectedId = id;
    const point = state.points.find(p => p.id === id);
    if (!point) return;

    renderHotspots();
    fillForm(point);
    showForm();
    centerToPoint(point.x, point.y);
  }

  // 填充表单
  function fillForm(point) {
    els.pId.value = point.id;
    els.pTitle.value = point.title || '';
    els.pCategory.value = point.category || state.categories[0].id;
    els.pArea.value = point.area || '';
    els.pSummary.value = point.summary || '';
    els.pStory.value = point.story || '';
    els.pX.value = point.x ? point.x.toFixed(4) : '';
    els.pY.value = point.y ? point.y.toFixed(4) : '';
  }

  // 显示表单
  function showForm() {
    els.panelEmpty.style.display = 'none';
    els.panelForm.classList.add('show');
  }

  // 隐藏表单
  function hideForm() {
    els.panelEmpty.style.display = 'flex';
    els.panelForm.classList.remove('show');
  }

  // 从表单读取点数据
  function readForm() {
    return {
      id: els.pId.value,
      title: els.pTitle.value.trim(),
      category: els.pCategory.value,
      area: els.pArea.value.trim(),
      summary: els.pSummary.value.trim(),
      story: els.pStory.value.trim(),
      x: parseFloat(els.pX.value) || 0,
      y: parseFloat(els.pY.value) || 0,
      shape: null
    };
  }

  // 保存点
  function savePoint(e) {
    e.preventDefault();
    console.log('💾 savePoint 被调用');
    const data = readForm();
    console.log('📝 表单数据:', data);
    if (!data.title) {
      alert('请填写标题');
      return;
    }

    const index = state.points.findIndex(p => p.id === data.id);
    if (index >= 0) {
      state.points[index] = { ...state.points[index], ...data };
    } else {
      state.points.push(data);
    }

    updateTotalCount();
    renderHotspots();
    showHint('已保存：' + data.title);
  }

  // 删除点
  function deletePoint() {
    const id = els.pId.value;
    if (!id) return;

    const point = state.points.find(p => p.id === id);
    const title = point ? point.title : '这个故事点';

    showConfirm('确认删除', `确定要删除「${title}」吗？删除后不可恢复。`, () => {
      state.points = state.points.filter(p => p.id !== id);
      state.selectedId = null;
      updateTotalCount();
      renderHotspots();
      hideForm();
      showHint('已删除');
    });
  }

  // 显示确认弹窗
  function showConfirm(title, message, onConfirm) {
    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    els.confirmModal.classList.add('show');

    els.okConfirmBtn.onclick = null;
    els.cancelConfirmBtn.onclick = null;
    els.closeConfirmModal.onclick = null;

    els.okConfirmBtn.onclick = () => {
      hideConfirm();
      if (onConfirm) onConfirm();
    };

    const cancel = () => hideConfirm();
    els.cancelConfirmBtn.onclick = cancel;
    els.closeConfirmModal.onclick = cancel;
  }

  // 隐藏确认弹窗
  function hideConfirm() {
    els.confirmModal.classList.remove('show');
  }

  // 添加点模式
  function toggleAddPointMode() {
    if (state.mode === 'addPoint') {
      setMode('select');
    } else {
      setMode('addPoint');
    }
  }

  // 设置模式
  function setMode(mode) {
    state.mode = mode;
    state.selectedId = null;
    els.addPointBtn.classList.toggle('active', mode === 'addPoint');
    els.mapContainer.classList.toggle('add-mode', mode === 'addPoint');

    if (mode === 'addPoint') {
      showHint('在地图上点击放置新故事点');
      hideForm();
    } else {
      showHint('点击标记选择，拖动标记调整位置');
    }
  }

  // 显示提示
  function showHint(text) {
    els.editorHint.textContent = text;
    setTimeout(() => {
      if (els.editorHint.textContent === text) {
        els.editorHint.textContent = '点击标记选择，拖动标记调整位置';
      }
    }, 2500);
  }

  // 在地图上添加点
  function addPointAt(e) {
    const rect = els.mapContainer.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const x = (screenX - state.transform.x) / (state.mapWidth * state.transform.scale);
    const y = (screenY - state.transform.y) / (state.mapHeight * state.transform.scale);

    const newPoint = {
      id: generateId(),
      title: '新故事点',
      category: state.categories[0].id,
      area: '',
      summary: '',
      story: '',
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      shape: null
    };

    state.points.push(newPoint);
    updateTotalCount();
    renderHotspots();
    selectPoint(newPoint.id);
    setMode('select');
  }

  // 开始拖动点
  function startDragPoint(e, id) {
    if (state.mode !== 'select') return;
    e.preventDefault();
    e.stopPropagation();

    state.isDraggingPoint = false;
    state.hasDragged = false;
    state.draggedPointId = id;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    state.dragStartX = clientX;
    state.dragStartY = clientY;

    const hotspot = document.querySelector(`.edit-hotspot[data-id="${id}"]`);
    if (hotspot) hotspot.classList.add('dragging');

    const moveHandler = (ev) => dragPoint(ev, id);
    const endHandler = () => endDragPoint(id, moveHandler, endHandler);

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', endHandler);
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('touchend', endHandler);
  }

  // 拖动点
  function dragPoint(e, id) {
    e.preventDefault();
    const rect = els.mapContainer.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const dist = Math.sqrt(Math.pow(clientX - state.dragStartX, 2) + Math.pow(clientY - state.dragStartY, 2));
    if (dist > 5) {
      state.hasDragged = true;
      state.isDraggingPoint = true;
    }

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const x = (screenX - state.transform.x) / (state.mapWidth * state.transform.scale);
    const y = (screenY - state.transform.y) / (state.mapHeight * state.transform.scale);

    const point = state.points.find(p => p.id === id);
    if (point) {
      point.x = Math.max(0, Math.min(1, x));
      point.y = Math.max(0, Math.min(1, y));

      const hotspot = document.querySelector(`.edit-hotspot[data-id="${id}"]`);
      if (hotspot) {
        hotspot.style.left = (point.x * 100) + '%';
        hotspot.style.top = (point.y * 100) + '%';
      }

      if (state.selectedId === id) {
        els.pX.value = point.x.toFixed(4);
        els.pY.value = point.y.toFixed(4);
      }
    }
  }

  // 结束拖动点
  function endDragPoint(id, moveHandler, endHandler) {
    window.removeEventListener('mousemove', moveHandler);
    window.removeEventListener('mouseup', endHandler);
    window.removeEventListener('touchmove', moveHandler);
    window.removeEventListener('touchend', endHandler);

    const hotspot = document.querySelector(`.edit-hotspot[data-id="${id}"]`);
    if (hotspot) hotspot.classList.remove('dragging');

    state.isDraggingPoint = false;
    state.draggedPointId = null;
    setTimeout(() => {
      state.hasDragged = false;
    }, 100);
  }

  // 地图事件
  function setupMapEvents() {
    // 点击地图空白处
    els.mapContainer.addEventListener('click', (e) => {
      if (state.mode === 'addPoint') {
        if (e.target === els.mapContainer || e.target === els.mapWrapper || e.target === els.mapImage) {
          addPointAt(e);
        }
      } else if (!state.isDraggingPoint && !state.hasDragged) {
        if (e.target === els.mapContainer || e.target === els.mapWrapper || e.target === els.mapImage) {
          state.selectedId = null;
          renderHotspots();
          hideForm();
        }
      }
    });

    // 地图拖拽
    els.mapContainer.addEventListener('mousedown', startDragMap);
    window.addEventListener('mousemove', dragMap);
    window.addEventListener('mouseup', endDragMap);
    els.mapContainer.addEventListener('touchstart', startDragMap, { passive: false });
    window.addEventListener('touchmove', dragMap, { passive: false });
    window.addEventListener('touchend', endDragMap);

    // 缩放
    els.mapContainer.addEventListener('wheel', handleWheel, { passive: false });
  }

  // 开始拖动地图
  function startDragMap(e) {
    if (state.mode !== 'select') return;
    if (e.target.closest('.edit-hotspot')) return;

    state.isDraggingMap = true;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    state.startX = clientX - state.transform.x;
    state.startY = clientY - state.transform.y;
  }

  // 拖动地图
  function dragMap(e) {
    if (!state.isDraggingMap) return;
    e.preventDefault();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    state.transform.x = clientX - state.startX;
    state.transform.y = clientY - state.startY;
    applyTransform();
  }

  // 结束拖动地图
  function endDragMap() {
    state.isDraggingMap = false;
  }

  // 滚轮缩放
  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomTo(delta, { x: e.clientX, y: e.clientY });
  }

  // 缩放到指定级别
  function zoomTo(ratio, center) {
    const newScale = Math.max(state.minScale, Math.min(state.transform.scale * ratio, state.maxScale));
    const r = newScale / state.transform.scale;
    const rect = els.mapContainer.getBoundingClientRect();
    const cx = center ? center.x - rect.left : state.containerWidth / 2;
    const cy = center ? center.y - rect.top : state.containerHeight / 2;

    state.transform.x = cx - (cx - state.transform.x) * r;
    state.transform.y = cy - (cy - state.transform.y) * r;
    state.transform.scale = newScale;
    applyTransform();
  }

  // 居中到点
  function centerToPoint(x, y) {
    updateDimensions();
    const targetX = state.containerWidth / 2 - x * state.mapWidth * state.transform.scale;
    const targetY = state.containerHeight / 2 - y * state.mapHeight * state.transform.scale;
    state.transform.x = targetX;
    state.transform.y = targetY;
    applyTransform();
  }

  // 适应屏幕
  function fitMapToScreen() {
    updateDimensions();
    if (state.mapWidth === 0 || state.mapHeight === 0) return;
    const scale = Math.min(
      state.containerWidth / state.mapWidth,
      state.containerHeight / state.mapHeight
    ) * 0.92;
    state.transform.scale = Math.max(state.minScale, Math.min(scale, state.maxScale));
    state.transform.x = (state.containerWidth - state.mapWidth * state.transform.scale) / 2;
    state.transform.y = (state.containerHeight - state.mapHeight * state.transform.scale) / 2;
    applyTransform();
  }

  // 更新尺寸
  function updateDimensions() {
    state.containerWidth = els.mapContainer.clientWidth;
    state.containerHeight = els.mapContainer.clientHeight;
    state.mapWidth = els.mapImage.naturalWidth || els.mapImage.width;
    state.mapHeight = els.mapImage.naturalHeight || els.mapImage.height;
  }

  // 应用变换
  function applyTransform() {
    const { x, y, scale } = state.transform;
    els.mapWrapper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    els.mapWrapper.style.setProperty('--map-scale', scale);
  }

  // 工具栏事件
  function setupEventListeners() {
    els.addPointBtn.addEventListener('click', toggleAddPointMode);
    els.previewBtn.addEventListener('click', () => {
      window.open('index.html', '_blank');
    });
    els.exportBtn.addEventListener('click', showExportModal);
    els.closeExportModal.addEventListener('click', hideExportModal);
    els.exportJsonBtn.addEventListener('click', exportJson);
    els.exportJsBtn.addEventListener('click', exportJs);
    els.fitMapBtn.addEventListener('click', fitMapToScreen);
    els.zoomInBtn.addEventListener('click', () => zoomTo(1.3));
    els.zoomOutBtn.addEventListener('click', () => zoomTo(1 / 1.3));

    els.panelForm.addEventListener('submit', savePoint);
    els.deleteBtn.addEventListener('click', () => {
      console.log('🗑️ deleteBtn 被点击');
      deletePoint();
    });

    // 手动点击保存的日志
    els.saveBtn.addEventListener('click', () => {
      console.log('🖱️ saveBtn 被点击（通过click事件）');
      // saveBtn 是 type=submit，会触发表单 submit 事件，不用额外处理
    });

    // 坐标输入变化时实时更新标记
    els.pX.addEventListener('input', updateSelectedHotspotPosition);
    els.pY.addEventListener('input', updateSelectedHotspotPosition);

    window.addEventListener('resize', () => {
      updateDimensions();
      fitMapToScreen();
    });

    els.mapImage.addEventListener('load', () => {
      updateDimensions();
      fitMapToScreen();
    });
  }

  // 根据表单坐标更新标记位置
  function updateSelectedHotspotPosition() {
    if (!state.selectedId) return;
    const point = state.points.find(p => p.id === state.selectedId);
    if (!point) return;

    const x = parseFloat(els.pX.value);
    const y = parseFloat(els.pY.value);
    if (isNaN(x) || isNaN(y)) return;

    point.x = Math.max(0, Math.min(1, x));
    point.y = Math.max(0, Math.min(1, y));

    const hotspot = document.querySelector(`.edit-hotspot[data-id="${state.selectedId}"]`);
    if (hotspot) {
      hotspot.style.left = (point.x * 100) + '%';
      hotspot.style.top = (point.y * 100) + '%';
    }
  }

  // 显示导出弹窗
  function showExportModal() {
    updateTotalCount();
    els.exportPreview.value = JSON.stringify(state.data, null, 2);
    els.exportModal.classList.add('show');
  }

  // 隐藏导出弹窗
  function hideExportModal() {
    els.exportModal.classList.remove('show');
  }

  // 导出 JSON
  function exportJson() {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'points.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // 导出 JS
  function exportJs() {
    const jsContent = 'const GUIDE_DATA = ' + JSON.stringify(state.data, null, 2) + ';\n';
    const blob = new Blob([jsContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'points.js';
    a.click();
    URL.revokeObjectURL(url);
  }

  // 启动
  init();
})();
