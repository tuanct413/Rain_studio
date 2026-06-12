import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, X, Volume2, Mic, Film, Type, Image as ImageIcon, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const BASE_URL = '/api';

// --- API Helpers ---
const apiCall = async (endpoint, method = 'POST', body = null, isQuery = false, isBlob = false) => {
  let url = `${BASE_URL}${endpoint}`;
  let options = {
    method,
    headers: {
      'Accept': 'application/json',
    }
  };

  if (body) {
    if (isQuery) {
      const params = new URLSearchParams(body).toString();
      url += `?${params}`;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || `HTTP error! status: ${response.status}`);
    }
    
    if (isBlob) {
      return await response.blob();
    }
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// --- Reusable UI Components ---

const Button = ({ children, onClick, variant = 'primary', disabled, className = '', loading = false }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-2 rounded font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#E50914] text-white hover:bg-[#b81d24]",
    secondary: "bg-white text-black hover:bg-gray-200",
    dark: "bg-[#333333] text-white hover:bg-[#404040]"
  };

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
};

const Input = ({ label, type = "text", value, onChange, placeholder, className = "" }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-sm text-gray-400 font-medium">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="bg-[#333] text-white px-4 py-2 rounded border border-transparent focus:border-gray-500 focus:outline-none transition-colors"
    />
  </div>
);

const Select = ({ label, value, onChange, options, className = "" }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-sm text-gray-400 font-medium">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="bg-[#333] text-white px-4 py-2 rounded border border-transparent focus:border-gray-500 focus:outline-none transition-colors"
    >
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value || opt}>{opt.label || opt}</option>
      ))}
    </select>
  </div>
);

// --- Feature Forms ---

const TTSForm = ({ voices }) => {
  const [text, setText] = useState('Xin chào, đây là hệ thống mô phỏng Netflix với Edge TTS.');
  const [voice, setVoice] = useState('vi-VN-HoaiMyNeural');
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const payload = {
        text, voice, 
        rate: `${rate >= 0 ? '+' : ''}${rate}%`, 
        volume: '+0%', pitch: '+0Hz'
      };
      const res = await apiCall('/tts-fast', 'POST', payload);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-400 font-medium">Nội dung văn bản</label>
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="bg-[#333] text-white px-4 py-2 rounded focus:outline-none focus:ring-1 ring-gray-500 w-full"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Giọng đọc" value={voice} onChange={(e) => setVoice(e.target.value)} options={voices.length ? voices : ['vi-VN-HoaiMyNeural']} />
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-400 font-medium">Tốc độ: {rate >= 0 ? '+' : ''}{rate}%</label>
          <input type="range" min="-50" max="50" value={rate} onChange={(e) => setRate(e.target.value)} className="w-full mt-2 accent-[#E50914]" />
        </div>
      </div>
      <Button onClick={handleGenerate} loading={loading} className="w-full mt-4"><Play className="w-4 h-4 fill-current"/> Tạo Âm Thanh</Button>
      
      {error && <div className="text-red-500 text-sm flex items-center gap-2 mt-2"><AlertCircle className="w-4 h-4"/> {error}</div>}
      {result && (
        <div className="mt-6 p-4 bg-[#222] rounded flex flex-col gap-4">
          <p className="text-green-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Tạo thành công!</p>
          <audio controls src={result.url} className="w-full" />
          <div className="flex gap-4">
             <a href={result.url} target="_blank" className="text-[#E50914] text-sm hover:underline flex items-center gap-1"><Download className="w-4 h-4"/> Audio</a>
             {result.srt_url && <a href={result.srt_url} target="_blank" className="text-gray-400 text-sm hover:underline flex items-center gap-1"><Download className="w-4 h-4"/> SRT</a>}
          </div>
        </div>
      )}
    </div>
  );
};

const MergeForm = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [error, setError] = useState(null);

  const handleMerge = async () => {
    setLoading(true); setError(null); setVideoBlobUrl(null);
    try {
      const payload = {
        video_url: videoUrl,
        audio_url: audioUrl,
        offset: 0,
        subtitle_color: "&H00FFFFFF",
        subtitle_max_chars_per_line: 36,
        dim_old_subtitle_area: true,
        dim_area_height_ratio: 0.28,
        dim_area_opacity: 0.8,
        hardsub_mask_mode: "blur"
      };
      if (subUrl) payload.subtitle_url = subUrl;
      const blob = await apiCall('/merge', 'POST', payload, false, true);
      setVideoBlobUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input label="Video Nguồn URL" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
      <Input label="Audio Lồng tiếng URL" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://..." />
      <Input label="Subtitle URL (Tuỳ chọn)" value={subUrl} onChange={(e) => setSubUrl(e.target.value)} placeholder="https://...srt" />
      
      <Button onClick={handleMerge} loading={loading} className="w-full mt-4" disabled={!videoUrl || !audioUrl}>
        <Film className="w-4 h-4"/> Bắt đầu Render
      </Button>

      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      {videoBlobUrl && (
        <div className="mt-6 p-4 bg-[#222] rounded flex flex-col gap-4">
           <video controls src={videoBlobUrl} className="w-full rounded" />
           <a href={videoBlobUrl} download="merged_video.mp4" className="text-white text-sm bg-[#333] p-2 text-center rounded hover:bg-[#404040]">Tải Video Xuống</a>
        </div>
      )}
    </div>
  );
};

const TranscribeForm = () => {
  const [audioUrl, setAudioUrl] = useState('');
  const [lang, setLang] = useState('vi');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleTranscribe = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await apiCall('/transcribe', 'POST', { audio_url: audioUrl, language: lang }, true);
      setResult(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input label="Audio URL" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://..." />
      <Select label="Ngôn ngữ nhận diện" value={lang} onChange={(e) => setLang(e.target.value)} options={['vi', 'en', 'zh', 'ja', 'ko']} />
      <Button onClick={handleTranscribe} loading={loading} className="w-full" disabled={!audioUrl}><Type className="w-4 h-4"/> Trích Xuất Lời Thoại</Button>
      
      {result && (
        <div className="mt-4 p-4 bg-[#222] rounded">
          <a href={result.srt_url} target="_blank" className="text-green-400 hover:underline">Tải file SRT ({result.request_id})</a>
          <div className="mt-2 max-h-40 overflow-y-auto text-sm text-gray-300">
            {result.segments?.map((s, i) => <p key={i}>[{s.start} - {s.end}] {s.text}</p>)}
          </div>
        </div>
      )}
    </div>
  );
};

const LogoMergeForm = () => {
  const [imgUrl, setImgUrl] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result;
      setImageBase64(b64);
      setImagePreview(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result;
        setImageBase64(b64);
        setImagePreview(b64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setImageBase64('');
    setImageFileName('');
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMerge = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const payload = {
        scale: 0.2,
        auto_position: true,
        padding: 20
      };

      if (imageBase64) {
        payload.image_base64 = imageBase64.split(',')[1];
      } else if (imgUrl) {
        payload.image_url = imgUrl;
      } else {
        throw new Error("Vui lòng chọn ảnh hoặc nhập URL ảnh nguồn.");
      }

      const res = await apiCall('/image/merge-logo', 'POST', payload);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-400 font-medium">Chọn ảnh nguồn cần đóng dấu</label>
        
        {imagePreview ? (
          <div className="relative border border-gray-700 bg-[#222] rounded-md p-4 flex flex-col items-center justify-center">
            <img src={imagePreview} alt="Preview" className="max-h-48 rounded object-contain mb-2" />
            <span className="text-xs text-gray-400 truncate max-w-xs">{imageFileName}</span>
            <button 
              onClick={handleClearImage}
              className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
              title="Xóa ảnh"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 hover:border-gray-500 bg-[#333]/30 hover:bg-[#333]/50 rounded-md p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200"
          >
            <ImageIcon className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-300 font-medium text-center">
              Kéo thả ảnh vào đây hoặc <span className="text-[#E50914] hover:underline text-cursor">chọn từ thư viện</span>
            </p>
            <p className="text-xs text-gray-500">Hỗ trợ PNG, JPG, JPEG</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-500">Hoặc dùng URL ảnh</div>
      <Input 
        label="Image Background URL" 
        value={imgUrl} 
        onChange={(e) => {
          setImgUrl(e.target.value);
          if (e.target.value) handleClearImage();
        }} 
        placeholder="https://..." 
        disabled={!!imageBase64}
      />

      <Button onClick={handleMerge} loading={loading} className="w-full" disabled={!imageBase64 && !imgUrl}>
        <ImageIcon className="w-4 h-4"/> Đóng Dấu Logo
      </Button>

      {error && <div className="text-red-500 text-sm flex items-center gap-2 mt-2"><AlertCircle className="w-4 h-4"/> {error}</div>}

      {result?.download_url && (
        <div className="mt-6 p-4 bg-[#222] rounded flex flex-col gap-4">
          <p className="text-green-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Đóng dấu thành công!</p>
          <img src={result.download_url} alt="Result" className="w-full rounded border border-gray-600 mb-2"/>
          <a href={result.download_url} target="_blank" download="watermarked_image.png" className="text-white text-sm bg-[#333] p-2 text-center rounded hover:bg-[#404040]">Tải ảnh xuống</a>
        </div>
      )}
    </div>
  );
};

// --- Main App & Layout ---

const TOOLS = [
  { id: 'tts', title: 'Studio Lồng Tiếng', desc: 'Chuyển đổi văn bản thành giọng nói chuẩn Studio với Edge TTS.', tag: 'Mới', cat: 'Audio', Component: TTSForm, img: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=800' },
  { id: 'merge', title: 'Xưởng Phim (Merge)', desc: 'Ghép Audio, Video và tự động làm mờ phụ đề cũ chuyên nghiệp.', tag: 'Hot', cat: 'Video', Component: MergeForm, img: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800' },
  { id: 'transcribe', title: 'Trích Xuất Lời Thoại', desc: 'Sử dụng AI Whisper để nghe và tạo phụ đề SRT từ Audio.', tag: 'AI', cat: 'Subtitle', Component: TranscribeForm, img: 'https://images.unsplash.com/photo-1528143358888-6d3c7f67bd5d?auto=format&fit=crop&q=80&w=800' },
  { id: 'logo', title: 'Đóng Dấu Poster', desc: 'Tự động chèn watermark/logo vào ảnh một cách thông minh.', tag: 'Công cụ', cat: 'Image', Component: LogoMergeForm, img: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800' },
];

export default function App() {
  const [activeTool, setActiveTool] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fetch voices on load for TTS
    apiCall('/voices', 'GET').then(res => {
        if(Array.isArray(res)) setVoices(res);
        else if(res && Array.isArray(res.voices)) setVoices(res.voices);
    }).catch(e => console.log("Could not load voices, using defaults."));
  }, []);

  const openModal = (tool) => {
    setActiveTool(tool);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveTool(null);
    document.body.style.overflow = 'unset';
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans overflow-x-hidden selection:bg-[#E50914] selection:text-white">
      
      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-colors duration-300 ${isScrolled ? 'bg-[#141414] shadow-md shadow-black/50' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <div className="px-4 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl md:text-3xl font-black text-[#E50914] tracking-wider cursor-pointer">RAIN<span className="text-white text-lg font-light tracking-normal ml-1">STUDIO</span></h1>
            <ul className="hidden md:flex gap-4 text-sm font-medium text-gray-300">
              <li className="text-white cursor-pointer hover:text-gray-300 transition">Trang chủ</li>
              <li className="cursor-pointer hover:text-gray-300 transition">Phim & Video</li>
              <li className="cursor-pointer hover:text-gray-300 transition">Âm thanh</li>
              <li className="cursor-pointer hover:text-gray-300 transition">Phụ đề</li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-xs text-gray-400 bg-black/40 px-3 py-1 rounded-full border border-gray-700 hidden sm:block">Base API: {BASE_URL}</div>
             <img src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png" alt="User" className="w-8 h-8 rounded cursor-pointer" />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative h-[80vh] w-full flex items-center">
        <div className="absolute inset-0">
          <img src={TOOLS[1].img} alt="Hero" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
        </div>
        
        <div className="relative z-10 px-4 md:px-12 w-full max-w-3xl space-y-6 pt-20">
          <div className="flex items-center gap-2">
            <span className="text-[#E50914] font-bold text-4xl leading-none">N</span>
            <span className="text-gray-300 font-semibold tracking-widest text-sm uppercase">Original API</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold max-w-2xl drop-shadow-lg">Hệ Sinh Thái Xuất Bản Media</h2>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <span className="text-green-400">Độ trễ thấp</span>
            <span className="border border-gray-600 px-1 rounded text-gray-300">RESTful</span>
            <span className="text-gray-300">2026</span>
          </div>
          <p className="text-lg md:text-xl text-gray-200 drop-shadow max-w-2xl font-light">
            Trải nghiệm công cụ xử lý đa phương tiện tốc độ cao. Tạo giọng nói AI, ghép video, trích xuất phụ đề tự động chỉ với vài thao tác.
          </p>
          <div className="flex gap-4 pt-4">
            <Button variant="secondary" onClick={() => openModal(TOOLS[1])}>
              <Play className="w-6 h-6 fill-current" /> Bắt đầu Ghép Video
            </Button>
            <Button variant="dark" onClick={() => window.scrollTo({top: 600, behavior: 'smooth'})}>
              <Info className="w-6 h-6" /> Xem Danh Sách
            </Button>
          </div>
        </div>
      </div>

      {/* Content Rows */}
      <div className="px-4 md:px-12 pb-20 -mt-20 relative z-20 space-y-12">
        {['Trending', 'Công cụ'].map((cat, idx) => (
          <div key={idx}>
            <h3 className="text-xl font-bold mb-4 text-gray-100">{cat === 'Trending' ? 'Đang Thịnh Hành' : 'Khám Phá Công Cụ'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {TOOLS.map((tool) => (
                <div 
                  key={tool.id} 
                  className="group relative cursor-pointer overflow-hidden rounded-md aspect-[16/9] transition-transform duration-300 hover:scale-105 hover:z-30 shadow-lg"
                  onClick={() => openModal(tool)}
                >
                  <img src={tool.img} alt={tool.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 p-4 w-full translate-y-2 group-hover:translate-y-0 transition-transform">
                    <span className="bg-[#E50914] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-2 inline-block">{tool.tag}</span>
                    <h4 className="font-bold text-lg leading-tight">{tool.title}</h4>
                    <p className="text-xs text-gray-300 mt-1 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">{tool.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="px-4 md:px-12 py-8 border-t border-gray-800 text-gray-500 text-sm text-center">
        <p>Giao diện Demo - Base URL: {BASE_URL} /docs</p>
      </footer>

      {/* Modal / Detail View */}
      {activeTool && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start md:items-center p-4 md:p-10 bg-black/70 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-[#181818] shadow-2xl rounded-lg overflow-hidden border border-gray-800 my-4 md:my-auto">
            {/* Modal Cover Image */}
            <div className="relative h-64 w-full">
              <img src={activeTool.img} alt={activeTool.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] to-transparent" />
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-white hover:text-black transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="absolute bottom-6 left-8">
                <span className="text-[#E50914] font-bold text-sm tracking-widest uppercase mb-1 block">API endpoint</span>
                <h2 className="text-4xl font-bold text-white">{activeTool.title}</h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <activeTool.Component voices={voices} />
              </div>
              <div className="text-sm text-gray-400 space-y-4 border-l border-gray-700 pl-6">
                 <div>
                    <span className="text-gray-500">Mô tả:</span>
                    <p className="text-white mt-1">{activeTool.desc}</p>
                 </div>
                 <div>
                    <span className="text-gray-500">Phân loại:</span>
                    <p className="text-white mt-1">{activeTool.cat}</p>
                 </div>
                 <div>
                    <span className="text-gray-500">Tích hợp:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="bg-[#333] px-2 py-1 rounded text-xs text-gray-300 border border-gray-600">REST API</span>
                        <span className="bg-[#333] px-2 py-1 rounded text-xs text-gray-300 border border-gray-600">JSON</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}