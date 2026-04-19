import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react'
import getCroppedImg from '@/lib/cropImage'

interface ImageCropperModalProps {
  imageSrc: string
  aspectRatio: number
  onCropComplete: (croppedImageBlob: Blob) => void
  onCancel: () => void
  isCircle?: boolean
}

export default function ImageCropperModal({
  imageSrc,
  aspectRatio,
  onCropComplete,
  onCancel,
  isCircle = false
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (croppedImage) {
        onCropComplete(croppedImage)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[600px]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-lg text-gray-900">Crop Image</h3>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Cropper Container */}
        <div className="relative flex-1 bg-gray-50">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={isCircle ? "round" : "rect"}
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={setZoom}
          />
        </div>

        {/* Controls Container */}
        <div className="p-6 shrink-0 bg-white">
          <div className="flex items-center gap-4 mb-6">
            <ZoomOut className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <ZoomIn className="w-5 h-5 text-gray-400 shrink-0" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 font-bold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <div className="spinner border-white/20 border-t-white w-5 h-5" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Apply
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
