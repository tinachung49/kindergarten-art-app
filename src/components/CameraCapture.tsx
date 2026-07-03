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

  // Initialize camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } // Prefer back camera for tablets
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("無法存取相機，請確認瀏覽器權限設定。");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video stream
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Since we mirrored the video via CSS, we don't mirror the actual captured pixels here 
        // to keep it exactly as the camera saw it, or we can mirror it if needed.
        // For artwork, we want the true orientation.
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageUrl = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageUrl);
        
        // Stop stream to save battery
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
        {capturedImage ? "這張照片可以嗎？" : "將畫作對準畫面中心"}
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
      
      {/* Hidden canvas for processing */}
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
          <button 
            onClick={handleCapture} 
            className={styles.captureBtn}
            aria-label="拍照"
          >
            {/* Camera icon or just a white circle */}
            <span style={{ fontSize: "2rem" }}>📸</span>
          </button>
        )}
      </div>
    </div>
  );
}
