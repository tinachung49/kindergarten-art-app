"use client";

import { useState, useEffect, useRef } from "react";
import styles from "../app/camera/camera.module.css";
import { useRouter } from "next/navigation";

type Message = {
  role: "ai" | "user";
  text: string;
};

type DialogueInterfaceProps = {
  imageUrl: string;
  onReset: () => void;
};

export default function DialogueInterface({ imageUrl, onReset }: DialogueInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  // Function to make AI speak
  const speakText = (text: string) => {
    if (!isSoundOn || typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW"; 
    utterance.rate = 0.9; 
    utterance.pitch = 1.1; 

    const voices = window.speechSynthesis.getVoices();
    let bestVoice = 
      voices.find(v => v.lang.includes("zh") && (v.name.includes("Natural") || v.name.includes("Online"))) ||
      voices.find(v => v.lang.includes("zh-TW") && v.name.includes("Google")) ||
      voices.find(v => v.lang.includes("zh-TW") || v.lang.includes("zh_TW")) ||
      voices.find(v => v.lang.includes("zh"));

    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    startDialogue();
    
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "cmn-Hant-TW"; 

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              setInputValue((prev) => prev + event.results[i][0].transcript);
            } else {
              currentTranscript += event.results[i][0].transcript;
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setInputValue("");
      recognitionRef.current?.start();
      setIsRecording(true);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  };

  const toggleSound = () => {
    setIsSoundOn(!isSoundOn);
    if (isSoundOn && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const startDialogue = async () => {
    setIsTyping(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageUrl, history: [] }),
      });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setMessages([{ role: "ai", text: data.text }]);
      speakText(data.text);
    } catch (error) {
      const errorMsg = "哎呀！好像連線有點問題，我們再試一次好嗎？";
      setMessages([{ role: "ai", text: errorMsg }]);
      speakText(errorMsg);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    const userText = inputValue.trim();
    setInputValue("");
    const newMessages: Message[] = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageUrl, history: newMessages }),
      });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setMessages([...newMessages, { role: "ai", text: data.text }]);
      speakText(data.text);
    } catch (error) {
      const errorMsg = "抱歉，剛剛沒聽清楚，可以再說一次嗎？";
      setMessages([...newMessages, { role: "ai", text: errorMsg }]);
      speakText(errorMsg);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSave = async () => {
    if (!studentName.trim()) {
      alert("請輸入寶貝的名字！");
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch("/api/save-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          image: imageUrl,
          history: messages,
        }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "儲存失敗");
      
      alert("儲存成功！將為您跳轉回儀表板查看！");
      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      alert(`儲存失敗：${error.message}`);
    } finally {
      setIsSaving(false);
      setShowSaveDialog(false);
    }
  };

  return (
    <div className={styles.dialogueContainer}>
      {showSaveDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>儲存故事紀錄</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>請輸入寶貝的名字，這將會做為 Google 文件的標題名稱：</p>
            <input 
              type="text" 
              placeholder="寶貝的名字 (如: 小明)" 
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              disabled={isSaving}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setShowSaveDialog(false)} className="btn-secondary" style={{ backgroundColor: '#ccc', borderColor: '#ccc' }} disabled={isSaving}>取消</button>
              <button onClick={handleSave} className="btn-primary" disabled={isSaving || !studentName.trim()}>
                {isSaving ? "儲存中..." : "確認儲存"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.artworkSection}>
        <div className={styles.artworkPreview}>
          <img src={imageUrl} alt="Child's artwork" />
        </div>
        <button onClick={onReset} className="btn-secondary" style={{ width: "100%", marginBottom: "16px" }}>
          拍另一張畫作
        </button>
        <button onClick={toggleSound} className="btn-secondary" style={{ width: "100%", marginBottom: "16px", backgroundColor: isSoundOn ? "var(--color-primary)" : "#ccc", borderColor: "white" }}>
          {isSoundOn ? "🔊 語音朗讀：開啟" : "🔈 語音朗讀：關閉"}
        </button>
        <button onClick={() => setShowSaveDialog(true)} className="btn-primary" style={{ width: "100%", backgroundColor: "var(--color-accent)", color: "var(--color-text-main)", borderColor: "white" }}>
          💾 結束對話並儲存至 Google 文件
        </button>
      </div>

      <div className={styles.chatSection}>
        <div className={styles.chatHistory}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`${styles.messageBubble} ${msg.role === 'ai' ? styles.messageAi : styles.messageUser}`}>
              {msg.text}
            </div>
          ))}
          {isTyping && (
            <div className={`${styles.messageBubble} ${styles.messageAi}`}>
              <div className={styles.loadingDot}></div>
              <div className={styles.loadingDot}></div>
              <div className={styles.loadingDot}></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className={styles.chatInputArea}>
          <button 
            className={`${styles.micBtn} ${isRecording ? styles.recording : ''}`}
            onClick={toggleRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            title="語音輸入"
          >
            {isRecording ? "⏹️" : "🎤"}
          </button>
          <textarea 
            className={styles.chatInput}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "正在聆聽..." : "代替寶貝輸入對話..."}
            disabled={isTyping}
          />
          <button 
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={(!inputValue.trim() && !isRecording) || isTyping}
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
