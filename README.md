# 星光乐队 · Starlight Band Studio

在浏览器里组一支完整的乐队：弹奏、合唱团、音乐会、演唱会，还能上传歌曲，让 AI 把原声转成乐器演奏。电脑和手机浏览器都能直接打开，不用安装。

**在线体验：** https://yjj0339.github.io/starlight-band/

## 功能

- **演奏**：选一首歌、选一个声部，跟着下落的音符弹，实时打分；也可以只欣赏整支乐队演出。
- **合唱团 / 音乐会 / 演唱会**：选节目单或自选曲目，幕布拉开后一首接一首演出。合唱团模式由合唱团唱主旋律；音乐会可加合唱团伴唱；演唱会是乐队现场。
- **27 种乐器**：三角钢琴、电钢琴、管风琴、弦乐团、小提琴、大提琴、低音提琴、竖琴、长笛、单簧管、萨克斯、小号、圆号、长号、木吉他、古典吉他、电吉他、电贝斯、架子鼓、定音鼓、马林巴、八音盒、合成器、合唱团、古筝、二胡等。每种乐器都有对应的演奏界面（钢琴键盘、吉他和弦/指板、鼓组 + 16 步鼓机、古筝刮奏、弓弦滑音）。
- **真实乐器音色**：钢琴、弦乐、管乐、吉他、贝斯、鼓组使用真实录音采样；弦乐团由多把小提琴 / 大提琴采样叠成合奏；音乐厅混响 + 母线压缩与限幅。
- **上传歌曲，AI 转谱**：支持 MP3 / WAV / M4A / MIDI / 简谱。音频会先检测速度、拍号、调、和弦、鼓点和段落力度，再用神经网络逐音转谱，拆成主旋律、钢琴伴奏、低音线，换成乐器演奏（原声默认静音），也可以换成流行、抒情、摇滚、爵士、国风等编曲风格。
- **一键下载**：任何一首歌都能下载 44.1kHz / 320kbps 的完整 MP3（整支乐队离线渲染），也能导出 MIDI。
- **全局播放**：切换到任何页面，底部的迷你播放器都能继续控制播放。
- 37 首内置曲目（公有领域名曲 + 本项目原创曲目），支持外接 MIDI 键盘、电脑键盘演奏、录音。

## 本地使用

纯静态网页，没有构建步骤。直接双击 `index.html`（或 `打开星光乐队.bat`）即可在浏览器中打开。

真实乐器音色需要联网加载；离线时可在 ⚙ 设置里切换为“合成音色”。

## 开源组件与素材

- [Basic Pitch](https://github.com/spotify/basic-pitch-ts)（Spotify，Apache-2.0）：AI 多音高转谱模型，见 `js/vendor/BASIC-PITCH-LICENSE.txt`
- [TensorFlow.js](https://github.com/tensorflow/tfjs)（Apache-2.0）：已与 Basic Pitch 一起打包在 `js/vendor/basic-pitch.bundle.js`
- [lamejs](https://github.com/zhuker/lamejs)（LGPL-3.0）：MP3 编码，`js/lame.min.js`
- 乐器采样在运行时从网络加载：[Salamander Grand Piano](https://tonejs.github.io/audio/salamander/)、[tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)、[Tone.js drum samples](https://github.com/Tonejs/audio)，版权归原作者所有
