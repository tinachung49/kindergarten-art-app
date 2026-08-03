"use client";

import { useState, useRef, useEffect } from "react";
import styles from "../app/camera/camera.module.css";
import DialogueInterface from "./DialogueInterface";

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isDialogueMode, setIsDialogueMode] = useState(false);

  // Initialize camera with fallbacks
  const startCamera = async () => {
    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
      } catch {
        // Fallback for devices without environment camera constraint
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImage(event.target.result as string);
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageUrl);
        
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    setIsDialogueMode(true);
  };

  if (isDialogueMode && capturedImage) {
    return <DialogueInterface imageUrl={capturedImage} onReset={() => {
      setIsDialogueMode(false);
      handleRetake();
    }} />;
  }

  return (
    <div className={styles.cameraContainer}>
      <h3 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">
        {capturedImage ? "這張照片可以嗎？" : "將畫作對準畫面中心或上傳相片"}
      </h3>

      <div className={styles.videoWrapper}>
        {capturedImage ? (
          <img src={capturedImage} alt="Captured artwork" className={styles.previewImage} />
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={styles.video}
          />
        )}
      </div>
      
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className={styles.controls}>
        {capturedImage ? (
          <div className={styles.buttonGroup}>
            <button onClick={handleRetake} className="btn-secondary">
              重新拍攝
            </button>
            <button onClick={handleConfirm} className="btn-primary" style={{ padding: "12px 32px" }}>
              確認送出
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <button 
              onClick={handleCapture} 
              className={styles.captureBtn}
              aria-label="拍照"
            >
              <span style={{ fontSize: "2rem" }}>📸</span>
            </button>
            
            <label className="btn-secondary" style={{ cursor: "pointer", fontSize: "0.95rem", padding: "10px 20px" }}>
              🖼️ 從相簿選擇相片上傳
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
