(function() {
  'use strict';

  // 状态
  const state = {
    points: [],
    categories: [],
    routes: [],
    badges: [],
    checked: new Set(),
    earnedBadges: new Set(),
    currentPointId: null,
    currentRouteId: null,
    currentRouteIndex: -1,
    mode: 'explore', // 'explore' | 'guide'
    avatar: '🐱',
    voice: {
      mode: 'click', // 'off' | 'click' | 'auto'
      voiceURI: '',
      rate: 0.9,
      pitch: 1.0,
      userInteracted: false,
      speaking: false
    },
    transform: { x: 0, y: 0, scale: 1 },
    minScale: 0.5,
    maxScale: 4,
    isDragging: false,
    lastTouchDist: 0,
    startX: 0,
    startY: 0,
    containerWidth: 0,
    containerHeight: 0,
    mapWidth: 0,
    mapHeight: 0
  };

  // DOM 元素
  const els = {
    splash: document.getElementById('splash'),
    startBtn: document.getElementById('startBtn'),
    mapContainer: document.getElementById('mapContainer'),
    mapWrapper: document.getElementById('mapWrapper'),
    mapImage: document.getElementById('mapImage'),
    mapLoading: document.getElementById('mapLoading'),
    hotspotsLayer: document.getElementById('hotspotsLayer'),
    storySheet: document.getElementById('storySheet'),
    storyCategory: document.getElementById('storyCategory'),
    storyTitle: document.getElementById('storyTitle'),
    storyArea: document.getElementById('storyArea'),
    storySummary: document.getElementById('storySummary'),
    storyText: document.getElementById('storyText'),
    storyVoiceBtn: document.getElementById('storyVoiceBtn'),
    checkInBtn: document.getElementById('checkInBtn'),
    uncheckBtn: document.getElementById('uncheckBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    progressText: document.getElementById('progressText'),
    resetBtn: document.getElementById('resetBtn'),
    modeBtn: document.getElementById('modeBtn'),
    modeText: document.querySelector('.mode-text'),
    modeHint: document.getElementById('modeHint'),
    routeBtn: document.getElementById('routeBtn'),
    routeModal: document.getElementById('routeModal'),
    routeList: document.getElementById('routeList'),
    closeRouteModal: document.getElementById('closeRouteModal'),
    voiceSettingsBtn: document.getElementById('voiceSettingsBtn'),
    voiceIcon: document.getElementById('voiceIcon'),
    voiceModal: document.getElementById('voiceModal'),
    closeVoiceModal: document.getElementById('closeVoiceModal'),
    voiceModeGroup: document.getElementById('voiceModeGroup'),
    voiceSelect: document.getElementById('voiceSelect'),
    voiceSelectWrap: document.getElementById('voiceSelectWrap'),
    voiceRate: document.getElementById('voiceRate'),
    voiceRateValue: document.getElementById('voiceRateValue'),
    voicePitch: document.getElementById('voicePitch'),
    voicePitchValue: document.getElementById('voicePitchValue'),
    voiceTestBtn: document.getElementById('voiceTestBtn'),
    resultModal: document.getElementById('resultModal'),
    closeResultModal: document.getElementById('closeResultModal'),
    resultCount: document.getElementById('resultCount'),
    resultCategories: document.getElementById('resultCategories'),
    resultPoints: document.getElementById('resultPoints'),
    badgeModal: document.getElementById('badgeModal'),
    badgeIcon: document.getElementById('badgeIcon'),
    badgeTitle: document.getElementById('badgeTitle'),
    badgeDesc: document.getElementById('badgeDesc'),
    closeBadgeModal: document.getElementById('closeBadgeModal'),
    avatarModal: document.getElementById('avatarModal'),
    avatarGrid: document.getElementById('avatarGrid'),
    confirmAvatarBtn: document.getElementById('confirmAvatarBtn'),
    certificateModal: document.getElementById('certificateModal'),
    closeCertificateModal: document.getElementById('closeCertificateModal'),
    certName: document.getElementById('certName'),
    certNameInput: document.getElementById('certNameInput'),
    certCount: document.getElementById('certCount'),
    certDate: document.getElementById('certDate'),
    certNo: document.getElementById('certNo'),
    updateCertNameBtn: document.getElementById('updateCertNameBtn'),
    downloadCertBtn: document.getElementById('downloadCertBtn'),
    toastContainer: document.getElementById('toastContainer')
  };

  // 初始化
  async function init() {
    await loadData();
    loadChecked();
    loadVoiceSettings();
    initSpeechSynthesis();
    setupEventListeners();
    setupZoomControls();
    renderHotspots();
    renderAvatarGrid();
    updateProgress();
    updateVoiceIcon();

    // 等待地图图片加载完成后再适配屏幕
    if (els.mapImage.complete && els.mapImage.naturalWidth > 0) {
      fitMapToScreen();
    } else {
      els.mapImage.addEventListener('load', fitMapToScreen, { once: true });
      els.mapImage.addEventListener('error', () => {
        console.error('平面图加载失败');
        alert('平面图加载失败，请检查图片路径');
      }, { once: true });
    }

    els.startBtn.addEventListener('click', () => {
      // 首次使用显示头像选择，否则直接进入
      const hasSeenAvatar = localStorage.getItem('chaozhou-avatar-seen');
      if (!hasSeenAvatar) {
        showAvatarModal();
      } else {
        enterMap();
      }
    });

    els.confirmAvatarBtn.addEventListener('click', () => {
      localStorage.setItem('chaozhou-avatar-seen', '1');
      hideAvatarModal();
      enterMap();
    });

    // 进入地图
    function enterMap() {
      els.splash.classList.add('hide');
      setTimeout(() => {
        updateDimensions();
        fitMapToScreen();
        showModeHint();
      }, 100);
    }

    // 调试/预览模式：URL 带 ?preview=1 时自动进入地图
    if (location.search.includes('preview=1')) {
      setTimeout(() => {
        els.splash.classList.add('hide');
        updateDimensions();
        fitMapToScreen();
        // 可选：URL 带 checked=p01,p02 时模拟已打卡
        const checkedMatch = location.search.match(/checked=([a-z0-9,]+)/);
        if (checkedMatch) {
          checkedMatch[1].split(',').forEach(id => state.checked.add(id));
          renderHotspots();
          updateProgress();
        }
        // 可选：URL 带 active=xxx 时自动选中某个点
        var match = location.search.match(/active=([a-z0-9]+)/);
        if (match) selectPoint(match[1]);
        // 可选：URL 带 certificate=1 时直接显示证书
        if (location.search.includes('certificate=1')) {
          setTimeout(showCertificate, 1500);
        }
        // 可选：URL 带 badge=xxx 时直接显示徽章弹窗
        var badgeMatch = location.search.match(/badge=([a-z0-9]+)/);
        if (badgeMatch) {
          var badge = state.badges.find(b => b.id === badgeMatch[1]);
          if (badge) setTimeout(() => showBadgeModal(badge), 1000);
        }
      }, 300);
    }
  }

  // 加载数据
  async function loadData() {
    // 优先从 localStorage 加载编辑器保存的数据
    const saved = localStorage.getItem('chaozhou-guide-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        state.points = data.points || [];
        state.categories = data.categories || [];
        state.routes = data.routes || [];
        state.badges = data.badges || [];
        return;
      } catch (e) { /* fall through */ }
    }

    // 其次从 GUIDE_DATA 全局变量加载
    if (typeof GUIDE_DATA !== 'undefined') {
      state.points = GUIDE_DATA.points;
      state.categories = GUIDE_DATA.categories;
      state.routes = GUIDE_DATA.routes;
      state.badges = GUIDE_DATA.badges || [];
      return;
    }

    // 兜底：fetch JSON
    try {
      const response = await fetch('data/points.json');
      const data = await response.json();
      state.points = data.points;
      state.categories = data.categories;
      state.routes = data.routes;
      state.badges = data.badges || [];
    } catch (err) {
      console.error('加载数据失败:', err);
      alert('数据加载失败，请检查网络连接');
    }
  }

  // 读取本地打卡记录
  function loadChecked() {
    try {
      const saved = localStorage.getItem('chaozhou-checked');
      if (saved) {
        state.checked = new Set(JSON.parse(saved));
      }
      const savedBadges = localStorage.getItem('chaozhou-badges');
      if (savedBadges) {
        state.earnedBadges = new Set(JSON.parse(savedBadges));
      }
      const savedAvatar = localStorage.getItem('chaozhou-avatar');
      if (savedAvatar) {
        state.avatar = savedAvatar;
      }
    } catch (e) {
      state.checked = new Set();
      state.earnedBadges = new Set();
    }
  }

  // 保存打卡记录
  function saveChecked() {
    try {
      localStorage.setItem('chaozhou-checked', JSON.stringify([...state.checked]));
      localStorage.setItem('chaozhou-badges', JSON.stringify([...state.earnedBadges]));
      localStorage.setItem('chaozhou-avatar', state.avatar);
    } catch (e) {
      // ignore
    }
  }

  // 加载语音设置
  function loadVoiceSettings() {
    try {
      const saved = localStorage.getItem('chaozhou-voice');
      if (saved) {
        const settings = JSON.parse(saved);
        state.voice.mode = settings.mode || 'click';
        state.voice.voiceURI = settings.voiceURI || '';
        state.voice.rate = typeof settings.rate === 'number' ? settings.rate : 0.9;
        state.voice.pitch = typeof settings.pitch === 'number' ? settings.pitch : 1.0;
      }
    } catch (e) {
      // ignore
    }
  }

  // 保存语音设置
  function saveVoiceSettings() {
    try {
      localStorage.setItem('chaozhou-voice', JSON.stringify({
        mode: state.voice.mode,
        voiceURI: state.voice.voiceURI,
        rate: state.voice.rate,
        pitch: state.voice.pitch
      }));
    } catch (e) {
      // ignore
    }
  }

  // 初始化语音合成
  function initSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
      state.voice.mode = 'off';
      return;
    }

    // 某些浏览器需要异步加载语音列表
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      populateVoiceSelect(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // 填充音色选择器
  function populateVoiceSelect(voices) {
    if (!els.voiceSelect) return;

    // 过滤中文语音
    const zhVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('zh'));

    // 只保留指定的音色：善怡、美嘉、语舒、Li-Mu
    const preferredNames = ['善怡', '美嘉', '语舒', 'Li-Mu'];
    const filteredVoices = zhVoices.filter(v =>
      preferredNames.some(name => v.name.includes(name))
    );

    // 如果指定音色都不存在，回退显示所有中文音色
    const displayVoices = filteredVoices.length > 0 ? filteredVoices : zhVoices;

    els.voiceSelect.innerHTML = '';

    // 默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '默认音色';
    els.voiceSelect.appendChild(defaultOption);

    displayVoices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = voice.name;
      els.voiceSelect.appendChild(option);
    });

    // 恢复已保存的选择
    if (state.voice.voiceURI) {
      els.voiceSelect.value = state.voice.voiceURI;
    }

    // 如果没有可选音色，隐藏选择器
    if (displayVoices.length <= 1) {
      els.voiceSelectWrap.style.display = 'none';
    } else {
      els.voiceSelectWrap.style.display = 'block';
    }
  }

  // 获取当前选中的语音
  function getSelectedVoice() {
    if (!state.voice.voiceURI) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.voiceURI === state.voice.voiceURI) || null;
  }

  // 播报文本
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    if (!text) return;

    // 停止当前播报
    stopSpeaking();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.rate = state.voice.rate;
    utter.pitch = state.voice.pitch;

    const voice = getSelectedVoice();
    if (voice) utter.voice = voice;

    utter.onstart = () => {
      state.voice.speaking = true;
      updateVoicePlayButton();
    };

    utter.onend = () => {
      state.voice.speaking = false;
      updateVoicePlayButton();
    };

    utter.onerror = () => {
      state.voice.speaking = false;
      updateVoicePlayButton();
    };

    window.speechSynthesis.speak(utter);
  }

  // 停止播报
  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    state.voice.speaking = false;
    updateVoicePlayButton();
  }

  // 播报当前故事点
  function speakCurrentPoint() {
    if (state.voice.mode === 'off') return;
    if (!state.currentPointId) return;

    const point = state.points.find(p => p.id === state.currentPointId);
    if (!point) return;

    const text = `${point.title}。${point.summary || ''}。${point.story || ''}`;
    speak(text);
  }

  // 切换故事卡片语音按钮状态
  function updateVoicePlayButton() {
    if (!els.storyVoiceBtn) return;
    els.storyVoiceBtn.textContent = state.voice.speaking ? '⏹' : '🔊';
    els.storyVoiceBtn.title = state.voice.speaking ? '停止播报' : '播报';
  }

  // 更新顶部语音图标
  function updateVoiceIcon() {
    if (!els.voiceIcon) return;
    if (state.voice.mode === 'off') {
      els.voiceIcon.textContent = '🔇';
    } else if (state.voice.mode === 'auto') {
      els.voiceIcon.textContent = '🔊';
    } else {
      els.voiceIcon.textContent = '🔈';
    }
  }

  // 显示语音设置弹窗
  function showVoiceModal() {
    if (!els.voiceModal) return;

    // 刷新模式按钮状态
    document.querySelectorAll('.voice-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === state.voice.mode);
    });

    // 刷新音色选择
    const voices = window.speechSynthesis.getVoices();
    populateVoiceSelect(voices);

    // 刷新滑块
    els.voiceRate.value = state.voice.rate;
    els.voiceRateValue.textContent = state.voice.rate.toFixed(1);
    els.voicePitch.value = state.voice.pitch;
    els.voicePitchValue.textContent = state.voice.pitch.toFixed(1);

    els.voiceModal.classList.add('show');
  }

  // 隐藏语音设置弹窗
  function hideVoiceModal() {
    if (els.voiceModal) els.voiceModal.classList.remove('show');
  }

  // 设置播报模式
  function setVoiceMode(mode) {
    state.voice.mode = mode;
    saveVoiceSettings();
    updateVoiceIcon();

    document.querySelectorAll('.voice-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // 自动模式下，如果当前有选中点且用户已交互过，立即播报
    if (mode === 'auto' && state.currentPointId && state.voice.userInteracted) {
      speakCurrentPoint();
    }

    if (mode === 'off') {
      stopSpeaking();
    }
  }

  // 渲染热点
  function renderHotspots() {
    els.hotspotsLayer.innerHTML = '';
    state.points.forEach(point => {
      const isChecked = state.checked.has(point.id);
      const isActive = point.id === state.currentPointId;
      const hotspot = document.createElement('div');
      hotspot.className = 'hotspot' + (isChecked ? ' checked' : '') + (isActive ? ' active' : '');
      hotspot.dataset.id = point.id;
      hotspot.style.left = (point.x * 100) + '%';
      hotspot.style.top = (point.y * 100) + '%';

      const dot = document.createElement('div');
      dot.className = 'hotspot-dot';
      dot.style.backgroundColor = getCategoryColor(point.category);

      const ring = document.createElement('div');
      ring.className = 'hotspot-ring';
      ring.style.borderColor = getCategoryColor(point.category);

      // 已打卡显示头像
      const avatar = document.createElement('div');
      avatar.className = 'hotspot-avatar';
      avatar.textContent = isChecked ? state.avatar : '';

      const label = document.createElement('div');
      label.className = 'hotspot-label';
      label.textContent = point.title;

      hotspot.appendChild(dot);
      hotspot.appendChild(ring);
      hotspot.appendChild(avatar);
      hotspot.appendChild(label);

      hotspot.addEventListener('click', (e) => {
        e.stopPropagation();
        state.voice.userInteracted = true;
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
    return cat ? cat.name : '其他';
  }

  // 选择故事点
  function selectPoint(id) {
    const point = state.points.find(p => p.id === id);
    if (!point) return;

    state.currentPointId = id;

    // 切换点时先停止当前播报
    stopSpeaking();

    // 更新热点样式
    document.querySelectorAll('.hotspot').forEach(h => h.classList.remove('active'));
    const activeHotspot = document.querySelector(`.hotspot[data-id="${id}"]`);
    if (activeHotspot) activeHotspot.classList.add('active');

    // 填充故事卡片
    els.storyCategory.textContent = getCategoryName(point.category);
    els.storyCategory.style.backgroundColor = getCategoryColor(point.category) + '33';
    els.storyCategory.style.color = getCategoryColor(point.category);
    els.storyTitle.textContent = point.title;
    els.storyArea.textContent = point.area;
    els.storySummary.textContent = point.summary;
    els.storyText.textContent = point.story;

    // 更新打卡按钮
    updateCheckInButton();

    // 更新语音按钮
    updateVoicePlayButton();

    // 更新导航按钮
    updateNavButtons();

    // 打开故事卡片
    els.storySheet.classList.add('open');

    // 自动播报
    if (state.voice.mode === 'auto' && state.voice.userInteracted) {
      setTimeout(speakCurrentPoint, 300);
    }
  }

  // 更新打卡按钮
  function updateCheckInButton() {
    const checked = state.checked.has(state.currentPointId);
    els.checkInBtn.classList.toggle('checked', checked);
    els.checkInBtn.querySelector('.btn-text').textContent = checked ? '已打卡' : '打卡';
    els.checkInBtn.querySelector('.btn-icon').textContent = checked ? '✓' : '📍';
    els.uncheckBtn.classList.toggle('visible', checked);
  }

  // 更新导航按钮
  function updateNavButtons() {
    if (state.mode === 'guide' && state.currentRouteId) {
      const route = state.routes.find(r => r.id === state.currentRouteId);
      const index = route.points.indexOf(state.currentPointId);
      els.prevBtn.disabled = index <= 0;
      els.nextBtn.disabled = index >= route.points.length - 1;
    } else {
      const index = state.points.findIndex(p => p.id === state.currentPointId);
      els.prevBtn.disabled = index <= 0;
      els.nextBtn.disabled = index >= state.points.length - 1;
    }
  }

  // 打卡
  function checkIn() {
    if (!state.currentPointId) return;
    const point = state.points.find(p => p.id === state.currentPointId);
    const alreadyChecked = state.checked.has(state.currentPointId);

    // 如果已打卡，则取消打卡
    if (alreadyChecked) {
      state.checked.delete(state.currentPointId);
      saveChecked();
      updateCheckInButton();
      updateProgress();
      renderHotspots();

      const activeHotspot = document.querySelector(`.hotspot[data-id="${state.currentPointId}"]`);
      if (activeHotspot) activeHotspot.classList.add('active');

      if (point) showToast(`↩️ 已取消：${point.title}`, '');
      return;
    }

    state.checked.add(state.currentPointId);
    saveChecked();
    updateCheckInButton();
    updateProgress();
    renderHotspots();

    // 重新标记当前选中
    const activeHotspot = document.querySelector(`.hotspot[data-id="${state.currentPointId}"]`);
    if (activeHotspot) activeHotspot.classList.add('active');

    // 首次打卡显示 Toast
    if (point) {
      showToast(`✓ 已打卡：${point.title}`, 'success');
      checkBadges();
    }

    // 如果全部打卡完成，显示证书
    if (state.checked.size === state.points.length) {
      setTimeout(showCertificate, 800);
    }
  }

  // 重置全部打卡
  function resetAllChecked() {
    if (state.checked.size === 0) {
      showToast('还没有打卡记录', '');
      return;
    }

    // 简单确认
    if (!confirm(`确定要清除全部 ${state.checked.size} 条打卡记录吗？此操作不可恢复。`)) return;

    state.checked.clear();
    state.earnedBadges.clear();
    saveChecked();
    updateProgress();
    renderHotspots();
    closeStorySheet();
    showToast('🔄 已重置全部打卡记录', 'success');
  }

  // 检查徽章
  function checkBadges() {
    const count = state.checked.size;
    const newBadges = [];

    state.badges.forEach(badge => {
      if (count >= badge.threshold && !state.earnedBadges.has(badge.id)) {
        state.earnedBadges.add(badge.id);
        newBadges.push(badge);
      }
    });

    if (newBadges.length > 0) {
      saveChecked();
      // 依次显示新徽章
      newBadges.forEach((badge, index) => {
        setTimeout(() => showBadgeModal(badge), index * 300);
      });
    }
  }

  // 显示 Toast
  function showToast(message, type = '') {
    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' ' + type : '');
    toast.textContent = message;
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2500);
  }

  // 显示徽章弹窗
  function showBadgeModal(badge) {
    els.badgeIcon.textContent = badge.icon;
    els.badgeTitle.textContent = `获得「${badge.name}」徽章`;
    els.badgeDesc.textContent = badge.desc;
    els.badgeModal.classList.add('show');
  }

  // 隐藏徽章弹窗
  function hideBadgeModal() {
    els.badgeModal.classList.remove('show');
  }

  // 渲染头像选择
  function renderAvatarGrid() {
    const avatars = ['🐱', '🐻', '🦊', '🐼', '🐶', '🐰', '🐯', '🦁'];
    els.avatarGrid.innerHTML = '';
    avatars.forEach(avatar => {
      const div = document.createElement('div');
      div.className = 'avatar-option' + (avatar === state.avatar ? ' selected' : '');
      div.textContent = avatar;
      div.addEventListener('click', () => selectAvatar(avatar));
      els.avatarGrid.appendChild(div);
    });
  }

  // 选择头像
  function selectAvatar(avatar) {
    state.avatar = avatar;
    saveChecked();
    renderAvatarGrid();
    renderHotspots();
  }

  // 显示头像选择弹窗
  function showAvatarModal() {
    renderAvatarGrid();
    els.avatarModal.classList.add('show');
  }

  // 隐藏头像选择弹窗
  function hideAvatarModal() {
    els.avatarModal.classList.remove('show');
  }

  // 显示证书
  function showCertificate() {
    const count = state.checked.size;
    const name = localStorage.getItem('chaozhou-cert-name') || '探索者';
    const certNo = localStorage.getItem('chaozhou-cert-no') || generateCertNo();
    localStorage.setItem('chaozhou-cert-no', certNo);
    els.certName.textContent = name;
    els.certNameInput.value = name === '探索者' ? '' : name;
    els.certCount.textContent = count;
    els.certDate.textContent = formatDate(new Date());
    els.certNo.textContent = 'NO. ' + certNo;
    els.certificateModal.classList.add('show');
  }

  // 生成证书编号
  function generateCertNo() {
    const date = new Date();
    const prefix = '' + date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 9000) + 1000);
    return prefix + '-' + random;
  }

  // 隐藏证书
  function hideCertificate() {
    els.certificateModal.classList.remove('show');
  }

  // 更新证书名字
  function updateCertName() {
    const name = els.certNameInput.value.trim() || '探索者';
    localStorage.setItem('chaozhou-cert-name', name);
    els.certName.textContent = name;
  }

  // 下载证书图片
  function downloadCertificate() {
    const width = 600;
    const height = 800;
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f8f4ec');
    gradient.addColorStop(0.5, '#ede6d6');
    gradient.addColorStop(1, '#e5dcc8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 内阴影效果
    ctx.shadowColor = 'rgba(201, 168, 108, 0.15)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillRect(0, 0, width, height);
    ctx.shadowColor = 'transparent';

    // 外边框
    ctx.strokeStyle = '#b8986a';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // 内边框
    ctx.strokeStyle = 'rgba(139, 115, 85, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(32, 32, width - 64, height - 64);

    // 顶部装饰
    ctx.fillStyle = '#a08050';
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('❖  ❖  ❖', width / 2, 56);

    // 酒店名
    ctx.fillStyle = '#8b7355';
    ctx.font = '13px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    ctx.fillText('潮州古城有熊酒店', width / 2, 110);

    // 标题
    ctx.fillStyle = '#5c4033';
    ctx.font = 'bold 36px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    ctx.fillText('故事探索认证', width / 2, 165);

    // 英文副标题
    ctx.fillStyle = '#9a8568';
    ctx.font = '12px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('CERTIFICATE OF EXPLORATION', width / 2, 195);

    // 分隔线
    const grad = ctx.createLinearGradient(width / 2 - 80, 0, width / 2 + 80, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, '#b8986a');
    grad.addColorStop(1, 'transparent');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, 230);
    ctx.lineTo(width / 2 + 80, 230);
    ctx.stroke();

    // 图标
    ctx.font = '60px serif';
    ctx.fillText('🏅', width / 2, 310);

    // 名字
    const name = els.certName.textContent || '探索者';
    ctx.fillStyle = '#6b4423';
    ctx.font = 'bold 32px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    ctx.fillText(name, width / 2, 380);

    // 名字下划线
    ctx.strokeStyle = 'rgba(139, 115, 85, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 100, 400);
    ctx.lineTo(width / 2 + 100, 400);
    ctx.stroke();

    // 描述
    const count = els.certCount.textContent || '30';
    ctx.fillStyle = '#5a4d3a';
    ctx.font = '16px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    ctx.fillText(`已完成全部 ${count} 个故事点探索`, width / 2, 460);

    // 日期
    ctx.fillStyle = '#8b7355';
    ctx.font = '14px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(els.certDate.textContent || formatDate(new Date()), width / 2, 520);

    // 编号
    ctx.fillStyle = '#a09078';
    ctx.font = '12px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(els.certNo.textContent || 'NO. 0001', width / 2, 550);

    // 印章
    ctx.save();
    ctx.translate(width - 90, height - 90);
    ctx.rotate(-12 * Math.PI / 180);
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#8b4513';
    ctx.font = 'bold 16px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    ctx.fillText('有熊', 0, 6);
    ctx.restore();

    // 下载
    const link = document.createElement('a');
    link.download = '有熊酒店探索认证.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // 格式化日期
  function formatDate(date) {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  }

  // 更新进度
  function updateProgress() {
    els.progressText.textContent = `${state.checked.size}/${state.points.length}`;
  }

  // 居中到指定坐标
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
    if (state.mapWidth === 0 || state.mapHeight === 0) {
      console.warn('平面图尺寸为 0，等待加载');
      return;
    }
    const scaleX = state.containerWidth / state.mapWidth;
    const scaleY = state.containerHeight / state.mapHeight;
    const scale = Math.min(scaleX, scaleY) * 0.95;
    state.transform.scale = Math.max(state.minScale, Math.min(scale, state.maxScale));
    state.transform.x = (state.containerWidth - state.mapWidth * state.transform.scale) / 2;
    state.transform.y = (state.containerHeight - state.mapHeight * state.transform.scale) / 2;
    // 首次适配时添加平滑动画
    if (!state.initialFitDone) {
      els.mapWrapper.style.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
      state.initialFitDone = true;
      setTimeout(() => {
        els.mapWrapper.style.transition = '';
      }, 500);
    }
    applyTransform();
    if (els.mapLoading) els.mapLoading.style.display = 'none';
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

  // 事件监听
  function setupEventListeners() {
    // 地图拖拽和缩放
    els.mapContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    els.mapContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    els.mapContainer.addEventListener('touchend', handleTouchEnd);
    els.mapContainer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    els.mapContainer.addEventListener('wheel', handleWheel, { passive: false });

    // 故事卡片按钮
    els.checkInBtn.addEventListener('click', checkIn);
    els.uncheckBtn.addEventListener('click', checkIn);
    els.prevBtn.addEventListener('click', () => navigatePoint(-1));
    els.nextBtn.addEventListener('click', () => navigatePoint(1));

    // 语音播报
    if (els.storyVoiceBtn) {
      els.storyVoiceBtn.addEventListener('click', () => {
        state.voice.userInteracted = true;
        if (state.voice.speaking) {
          stopSpeaking();
        } else {
          speakCurrentPoint();
        }
      });
    }

    if (els.voiceSettingsBtn) {
      els.voiceSettingsBtn.addEventListener('click', () => {
        state.voice.userInteracted = true;
        showVoiceModal();
      });
    }

    if (els.closeVoiceModal) {
      els.closeVoiceModal.addEventListener('click', hideVoiceModal);
    }

    if (els.voiceModeGroup) {
      els.voiceModeGroup.addEventListener('click', (e) => {
        if (e.target.classList.contains('voice-mode-btn')) {
          state.voice.userInteracted = true;
          setVoiceMode(e.target.dataset.mode);
        }
      });
    }

    if (els.voiceSelect) {
      els.voiceSelect.addEventListener('change', () => {
        state.voice.voiceURI = els.voiceSelect.value;
        saveVoiceSettings();
      });
    }

    if (els.voiceRate) {
      els.voiceRate.addEventListener('input', () => {
        state.voice.rate = parseFloat(els.voiceRate.value);
        els.voiceRateValue.textContent = state.voice.rate.toFixed(1);
        saveVoiceSettings();
      });
    }

    if (els.voicePitch) {
      els.voicePitch.addEventListener('input', () => {
        state.voice.pitch = parseFloat(els.voicePitch.value);
        els.voicePitchValue.textContent = state.voice.pitch.toFixed(1);
        saveVoiceSettings();
      });
    }

    if (els.voiceTestBtn) {
      els.voiceTestBtn.addEventListener('click', () => {
        state.voice.userInteracted = true;
        speak('欢迎来到潮州古城有熊酒店，这是语音播报的试听效果。');
      });
    }

    // 记录用户首次交互，解锁自动播报
    const markInteracted = () => {
      if (!state.voice.userInteracted) {
        state.voice.userInteracted = true;
      }
    };
    document.body.addEventListener('click', markInteracted, { once: true });
    document.body.addEventListener('touchstart', markInteracted, { once: true });

    // 模式切换
    els.modeBtn.addEventListener('click', toggleMode);

    // 路线选择
    els.routeBtn.addEventListener('click', showRouteModal);
    els.closeRouteModal.addEventListener('click', hideRouteModal);

    // 成果页
    els.progressText.addEventListener('click', showResult);
    els.closeResultModal.addEventListener('click', hideResultModal);

    // 重置打卡
    els.resetBtn.addEventListener('click', resetAllChecked);

    // 徽章弹窗
    els.closeBadgeModal.addEventListener('click', hideBadgeModal);

    // 证书弹窗
    els.closeCertificateModal.addEventListener('click', hideCertificate);
    els.updateCertNameBtn.addEventListener('click', updateCertName);
    els.downloadCertBtn.addEventListener('click', downloadCertificate);

    // 点击地图空白处关闭卡片
    els.mapContainer.addEventListener('click', (e) => {
      if (e.target === els.mapContainer || e.target === els.mapWrapper || e.target === els.mapImage) {
        closeStorySheet();
      }
    });

    // 窗口大小变化
    window.addEventListener('resize', () => {
      updateDimensions();
      if (els.mapImage.complete && els.mapImage.naturalWidth > 0) {
        fitMapToScreen();
      }
    });
  }

  // 触摸开始
  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      state.isDragging = true;
      state.startX = e.touches[0].clientX - state.transform.x;
      state.startY = e.touches[0].clientY - state.transform.y;
    } else if (e.touches.length === 2) {
      state.isDragging = false;
      state.lastTouchDist = getTouchDistance(e.touches);
    }
  }

  // 触摸移动
  function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && state.isDragging) {
      state.transform.x = e.touches[0].clientX - state.startX;
      state.transform.y = e.touches[0].clientY - state.startY;
      applyTransform();
    } else if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const scaleChange = dist / state.lastTouchDist;
      const newScale = state.transform.scale * scaleChange;
      zoomTo(newScale, getTouchCenter(e.touches));
      state.lastTouchDist = dist;
    }
  }

  // 触摸结束
  function handleTouchEnd() {
    state.isDragging = false;
  }

  // 鼠标按下
  function handleMouseDown(e) {
    state.isDragging = true;
    state.startX = e.clientX - state.transform.x;
    state.startY = e.clientY - state.transform.y;
  }

  // 鼠标移动
  function handleMouseMove(e) {
    if (!state.isDragging) return;
    state.transform.x = e.clientX - state.startX;
    state.transform.y = e.clientY - state.startY;
    applyTransform();
  }

  // 鼠标释放
  function handleMouseUp() {
    state.isDragging = false;
  }

  // 滚轮缩放
  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = state.transform.scale * delta;
    zoomTo(newScale, { x: e.clientX, y: e.clientY });
  }

  // 计算双指距离
  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 计算双指中心
  function getTouchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  // 缩放到指定级别
  function zoomTo(newScale, center) {
    newScale = Math.max(state.minScale, Math.min(newScale, state.maxScale));
    const ratio = newScale / state.transform.scale;
    const rect = els.mapContainer.getBoundingClientRect();
    const cx = center ? center.x - rect.left : state.containerWidth / 2;
    const cy = center ? center.y - rect.top : state.containerHeight / 2;

    state.transform.x = cx - (cx - state.transform.x) * ratio;
    state.transform.y = cy - (cy - state.transform.y) * ratio;
    state.transform.scale = newScale;
    applyTransform();
  }

  // 添加缩放控件
  function setupZoomControls() {
    const controls = document.createElement('div');
    controls.className = 'zoom-controls';
    controls.innerHTML = `
      <button id="zoomIn">+</button>
      <button id="zoomOut">−</button>
      <button id="fitMap">⌂</button>
    `;
    document.getElementById('app').appendChild(controls);

    controls.querySelector('#zoomIn').addEventListener('click', () => zoomTo(state.transform.scale * 1.3));
    controls.querySelector('#zoomOut').addEventListener('click', () => zoomTo(state.transform.scale / 1.3));
    controls.querySelector('#fitMap').addEventListener('click', fitMapToScreen);
  }

  // 导航到上一个/下一个
  function navigatePoint(direction) {
    let nextId;
    if (state.mode === 'guide' && state.currentRouteId) {
      const route = state.routes.find(r => r.id === state.currentRouteId);
      const currentIndex = route.points.indexOf(state.currentPointId);
      const nextIndex = currentIndex + direction;
      if (nextIndex >= 0 && nextIndex < route.points.length) {
        nextId = route.points[nextIndex];
      }
    } else {
      const currentIndex = state.points.findIndex(p => p.id === state.currentPointId);
      const nextIndex = currentIndex + direction;
      if (nextIndex >= 0 && nextIndex < state.points.length) {
        nextId = state.points[nextIndex].id;
      }
    }

    if (nextId) {
      state.voice.userInteracted = true;
      selectPoint(nextId);
    }
  }

  // 切换模式
  function toggleMode() {
    state.mode = state.mode === 'explore' ? 'guide' : 'explore';
    if (state.mode === 'guide') {
      els.modeText.textContent = '导览模式';
      els.modeBtn.querySelector('.mode-icon').textContent = '🎧';
      showRouteModal();
    } else {
      els.modeText.textContent = '探索模式';
      els.modeBtn.querySelector('.mode-icon').textContent = '🗺️';
      state.currentRouteId = null;
      state.currentRouteIndex = -1;
    }
    showModeHint();
  }

  // 显示模式提示
  function showModeHint() {
    els.modeHint.textContent = state.mode === 'explore'
      ? '探索模式：自由浏览地图上的故事点'
      : '导览模式：按推荐路线逐个点讲解';
    els.modeHint.classList.add('show');
    setTimeout(() => els.modeHint.classList.remove('show'), 2500);
  }

  // 关闭故事卡片
  function closeStorySheet() {
    els.storySheet.classList.remove('open');
    document.querySelectorAll('.hotspot').forEach(h => h.classList.remove('active'));
    stopSpeaking();
  }

  // 显示路线弹窗
  function showRouteModal() {
    renderRouteList();
    els.routeModal.classList.add('show');
  }

  // 隐藏路线弹窗
  function hideRouteModal() {
    els.routeModal.classList.remove('show');
  }

  // 渲染路线列表
  function renderRouteList() {
    els.routeList.innerHTML = '';
    state.routes.forEach(route => {
      const item = document.createElement('div');
      item.className = 'route-item';
      item.innerHTML = `
        <h4>${route.name}</h4>
        <p>${route.description} · 共 ${route.points.length} 个点</p>
      `;
      item.addEventListener('click', () => startRoute(route.id));
      els.routeList.appendChild(item);
    });
  }

  // 开始路线
  function startRoute(routeId) {
    state.mode = 'guide';
    state.currentRouteId = routeId;
    els.modeText.textContent = '导览模式';
    els.modeBtn.querySelector('.mode-icon').textContent = '🎧';
    hideRouteModal();
    showModeHint();

    const route = state.routes.find(r => r.id === routeId);
    if (route && route.points.length > 0) {
      state.voice.userInteracted = true;
      selectPoint(route.points[0]);
    }
  }

  // 显示成果页
  function showResult() {
    els.resultCount.textContent = state.checked.size;

    // 分类统计
    const catCounts = {};
    state.points.forEach(p => {
      catCounts[p.category] = (catCounts[p.category] || 0) + (state.checked.has(p.id) ? 1 : 0);
    });

    els.resultCategories.innerHTML = '';
    state.categories.forEach(cat => {
      const count = catCounts[cat.id] || 0;
      if (count > 0) {
        const tag = document.createElement('span');
        tag.className = 'category-tag';
        tag.style.color = cat.color;
        tag.style.border = `1px solid ${cat.color}44`;
        tag.textContent = `${cat.name} ${count}`;
        els.resultCategories.appendChild(tag);
      }
    });

    // 故事点列表
    els.resultPoints.innerHTML = '';
    state.points.forEach(point => {
      const div = document.createElement('div');
      div.className = 'result-point' + (state.checked.has(point.id) ? ' checked' : '');
      div.innerHTML = `
        <span class="check-icon">${state.checked.has(point.id) ? '✓' : ''}</span>
        <span>${point.title}</span>
      `;
      div.addEventListener('click', () => {
        state.voice.userInteracted = true;
        hideResultModal();
        selectPoint(point.id);
      });
      els.resultPoints.appendChild(div);
    });

    els.resultModal.classList.add('show');
  }

  // 隐藏成果页
  function hideResultModal() {
    els.resultModal.classList.remove('show');
  }

  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.error('Service Worker 注册失败:', err);
      });
    });
  }

  // 启动
  init();
})();
