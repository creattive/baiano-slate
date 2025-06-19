"use client"

import { useState, useEffect, useRef } from "react"
import { initializeApp } from "firebase/app"
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth"
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, setDoc, getDoc } from "firebase/firestore"
import {
  Film,
  Clapperboard,
  Download,
  Trash2,
  FileText,
  X,
  Tag,
  Edit,
  RefreshCw,
  PlusCircle,
  Palette,
  Calendar,
  BarChart3,
  ImageIcon,
  Camera,
  Upload,
  Settings,
  Zap,
  Sparkles,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

import jsPDF from "jspdf"
import "jspdf-autotable"
import emailjs from "@emailjs/browser"

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDT2sYqmXp_SsUlvQ5xSiC1-QNtHYC0nlY",
  authDomain: "slate-digital-3af96.firebaseapp.com",
  projectId: "slate-digital-3af96",
  storageBucket: "slate-digital-3af96.firebasestorage.app",
  messagingSenderId: "326330592783",
  appId: "1:326330592783:web:b1f52f92e4f41b93307d7a",
  measurementId: "G-B906F865D4",
}

// EmailJS Configuration
const EMAILJS_CONFIG = {
  serviceId: "service_digitalslate",
  templateId: "template_digitalslate",
  publicKey: "your_emailjs_public_key",
}

// Default Tag Configuration
const DEFAULT_TAGS = {
  "Bom Take": { color: "bg-emerald-500", textColor: "text-white", isDefault: true },
  Problema: { color: "bg-rose-500", textColor: "text-white", isDefault: true },
  Verificar: { color: "bg-amber-500", textColor: "text-white", isDefault: true },
  Áudio: { color: "bg-blue-500", textColor: "text-white", isDefault: true },
  Foco: { color: "bg-purple-500", textColor: "text-white", isDefault: true },
}

const CUSTOM_TAG_COLORS = [
  { name: "sky", color: "bg-sky-500" },
  { name: "indigo", color: "bg-indigo-500" },
  { name: "teal", color: "bg-teal-500" },
  { name: "pink", color: "bg-pink-500" },
  { name: "orange", color: "bg-orange-500" },
  { name: "violet", color: "bg-violet-500" },
]

// PDF Color Schemes
const PDF_COLOR_SCHEMES = {
  default: {
    name: "Amarelo Clássico",
    primary: [251, 191, 36],
    secondary: [55, 65, 81],
    accent: [34, 197, 94],
  },
  cinema: {
    name: "Cinema Dourado",
    primary: [255, 215, 0],
    secondary: [139, 69, 19],
    accent: [220, 20, 60],
  },
  modern: {
    name: "Azul Moderno",
    primary: [59, 130, 246],
    secondary: [30, 41, 59],
    accent: [16, 185, 129],
  },
  elegant: {
    name: "Roxo Elegante",
    primary: [147, 51, 234],
    secondary: [55, 48, 163],
    accent: [236, 72, 153],
  },
}

export default function DigitalSlate() {
  // Firebase State
  const [db, setDb] = useState(null)
  const [auth, setAuth] = useState(null)
  const [userId, setUserId] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const appId = "digital-slate-app"

  // Project Info State
  const [projectInfo, setProjectInfo] = useState({
    scriptTitle: "",
    recordingDate: new Date().toISOString().slice(0, 10),
    director: "",
    scriptSupervisor: "",
    productionCompany: "",
    logo: null,
  })

  // Slate Data State
  const [scene, setScene] = useState("1")
  const [take, setTake] = useState("1")
  const [roll, setRoll] = useState("A1")
  const [notes, setNotes] = useState("")
  const [takes, setTakes] = useState([])
  const [activeTags, setActiveTags] = useState([])
  const [tags, setTags] = useState(DEFAULT_TAGS)

  // Timecode State
  const [timecode, setTimecode] = useState("00:00:00:00")
  const [isTimecodeLive, setIsTimecodeLive] = useState(true)
  const [isEditingTimecode, setIsEditingTimecode] = useState(false)
  const timecodeIntervalRef = useRef()
  const manualTimeStartRef = useRef(0)
  const manualTimecodeAtStartRef = useRef(0)
  const frameRate = 24

  // UI State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(CUSTOM_TAG_COLORS[0].color)
  const [selectedColorScheme, setSelectedColorScheme] = useState("default")
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" })
  const [showAdvancedStats, setShowAdvancedStats] = useState(false)

  // Email State
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    message: "",
    senderName: "",
    senderEmail: "",
  })
  const [isEmailSending, setIsEmailSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState(null) // 'success', 'error', null

  // Novos estados
  const [editingTake, setEditingTake] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [currentTakePhotos, setCurrentTakePhotos] = useState([])
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Initialize EmailJS
  useEffect(() => {
    // Initialize EmailJS with your public key
    emailjs.init(EMAILJS_CONFIG.publicKey)
  }, [])

  // Firebase Initialization
  useEffect(() => {
    console.log("🔥 Iniciando Firebase...")

    try {
      const app = initializeApp(firebaseConfig)
      const firestoreDb = getFirestore(app)
      const firestoreAuth = getAuth(app)

      setDb(firestoreDb)
      setAuth(firestoreAuth)

      const unsubscribeAuth = onAuthStateChanged(firestoreAuth, async (user) => {
        if (user) {
          console.log("✅ Usuário autenticado:", user.uid)
          setUserId(user.uid)
        } else {
          console.log("🔐 Fazendo login anônimo...")
          try {
            await signInAnonymously(firestoreAuth)
          } catch (error) {
            console.error("❌ Erro no login:", error)
          }
        }
        setIsAuthReady(true)
      })

      return () => unsubscribeAuth()
    } catch (error) {
      console.error("❌ Erro Firebase:", error)
      setIsAuthReady(true)
    }
  }, [])

  // Data Fetching
  useEffect(() => {
    if (!isAuthReady || !db || !userId) return

    const takesCollectionPath = `/artifacts/${appId}/users/${userId}/takes`
    const qTakes = query(collection(db, takesCollectionPath))
    const unsubscribeTakes = onSnapshot(qTakes, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      setTakes(data)
    })

    const projectInfoDocPath = `/artifacts/${appId}/users/${userId}/projectInfo/details`
    const unsubscribeProject = onSnapshot(doc(db, projectInfoDocPath), (d) => {
      if (d.exists()) {
        setProjectInfo(d.data())
      }
    })

    const tagsDocPath = `/artifacts/${appId}/users/${userId}/settings/tags`
    const unsubscribeTags = onSnapshot(doc(db, tagsDocPath), (d) => {
      if (d.exists()) {
        setTags({ ...DEFAULT_TAGS, ...d.data() })
      } else {
        setTags(DEFAULT_TAGS)
      }
    })

    return () => {
      unsubscribeTakes()
      unsubscribeProject()
      unsubscribeTags()
    }
  }, [isAuthReady, db, userId, appId])

  // Timecode Logic
  const timeToMs = (tc, rate = 24) => {
    const parts = String(tc).split(":").map(Number)
    if (parts.length !== 4) return 0
    const [h, m, s, f] = parts
    return (h * 3600 + m * 60 + s) * 1000 + f * (1000 / rate)
  }

  const msToTime = (ms, rate = 24) => {
    if (isNaN(ms)) return "00:00:00:00"
    const totalSeconds = Math.floor(ms / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const f = Math.floor((ms % 1000) / (1000 / rate))
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`
  }

  useEffect(() => {
    clearInterval(timecodeIntervalRef.current)
    timecodeIntervalRef.current = setInterval(() => {
      if (isTimecodeLive) {
        const now = new Date()
        const frames = Math.floor(now.getMilliseconds() / (1000 / frameRate))
        setTimecode(`${now.toLocaleTimeString("pt-BR", { hour12: false })}:${String(frames).padStart(2, "0")}`)
      } else if (!isEditingTimecode) {
        const elapsed = performance.now() - manualTimeStartRef.current
        const newTotalMs = manualTimecodeAtStartRef.current + elapsed
        setTimecode(msToTime(newTotalMs, frameRate))
      }
    }, 1000 / frameRate)
    return () => clearInterval(timecodeIntervalRef.current)
  }, [isTimecodeLive, isEditingTimecode, frameRate])

  // Handlers
  const handleProjectInfoChange = (e) => {
    const { name, value } = e.target
    const updatedInfo = { ...projectInfo, [name]: value }
    setProjectInfo(updatedInfo)

    if (isAuthReady && db && userId) {
      setDoc(doc(db, `/artifacts/${appId}/users/${userId}/projectInfo/details`), updatedInfo, { merge: true }).catch(
        (error) => {
          console.error("Error saving project info:", error)
          localStorage.setItem("digitalSlate_projectInfo", JSON.stringify(updatedInfo))
        },
      )
    } else {
      localStorage.setItem("digitalSlate_projectInfo", JSON.stringify(updatedInfo))
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const logoData = event.target.result
        const updatedInfo = { ...projectInfo, logo: logoData }
        setProjectInfo(updatedInfo)

        if (isAuthReady && db && userId) {
          setDoc(doc(db, `/artifacts/${appId}/users/${userId}/projectInfo/details`), updatedInfo, { merge: true })
        } else {
          localStorage.setItem("digitalSlate_projectInfo", JSON.stringify(updatedInfo))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleToggleTag = (tagName) => {
    setActiveTags((prev) => (prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]))
  }

  // Photo handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (error) {
      console.error("Erro ao acessar câmera:", error)
      document.getElementById("photo-input").click()
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext("2d")
      ctx.drawImage(video, 0, 0)

      const photoData = canvas.toDataURL("image/jpeg", 0.8)
      setCurrentTakePhotos((prev) => [
        ...prev,
        {
          id: Date.now(),
          data: photoData,
          timestamp: new Date().toISOString(),
        },
      ])

      stopCamera()
    }
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setCurrentTakePhotos((prev) => [
          ...prev,
          {
            id: Date.now(),
            data: event.target.result,
            timestamp: new Date().toISOString(),
          },
        ])
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = (photoId) => {
    setCurrentTakePhotos((prev) => prev.filter((p) => p.id !== photoId))
  }

  const handleLogTake = async () => {
    const newTake = {
      id: Date.now().toString(),
      scene,
      take,
      roll,
      notes,
      timecode,
      tags: activeTags,
      photos: currentTakePhotos,
      timestamp: new Date().toISOString(),
    }

    if (isAuthReady && db && userId) {
      try {
        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/takes`), newTake)
      } catch (error) {
        console.error("Error saving to Firebase:", error)
        const localTakes = JSON.parse(localStorage.getItem("digitalSlate_takes") || "[]")
        localTakes.unshift(newTake)
        localStorage.setItem("digitalSlate_takes", JSON.stringify(localTakes))
        setTakes(localTakes)
      }
    } else {
      const localTakes = JSON.parse(localStorage.getItem("digitalSlate_takes") || "[]")
      localTakes.unshift(newTake)
      localStorage.setItem("digitalSlate_takes", JSON.stringify(localTakes))
      setTakes(localTakes)
    }

    setTake((prev) => String(Number.parseInt(prev, 10) + 1))
    setNotes("")
    setActiveTags([])
    setCurrentTakePhotos([])
  }

  const handleEditTake = (takeToEdit) => {
    setEditingTake(takeToEdit)
    setScene(takeToEdit.scene)
    setTake(takeToEdit.take)
    setRoll(takeToEdit.roll)
    setNotes(takeToEdit.notes)
    setActiveTags(takeToEdit.tags || [])
    setCurrentTakePhotos(takeToEdit.photos || [])
  }

  const handleUpdateTake = async () => {
    if (!editingTake) return

    const updatedTake = {
      ...editingTake,
      scene,
      take,
      roll,
      notes,
      tags: activeTags,
      photos: currentTakePhotos,
      updatedAt: new Date().toISOString(),
    }

    if (isAuthReady && db && userId) {
      try {
        await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/takes/${editingTake.id}`), updatedTake)
      } catch (error) {
        console.error("Error updating take:", error)
        const localTakes = JSON.parse(localStorage.getItem("digitalSlate_takes") || "[]")
        const updatedTakes = localTakes.map((t) => (t.id === editingTake.id ? updatedTake : t))
        localStorage.setItem("digitalSlate_takes", JSON.stringify(updatedTakes))
        setTakes(updatedTakes)
      }
    } else {
      const localTakes = JSON.parse(localStorage.getItem("digitalSlate_takes") || "[]")
      const updatedTakes = localTakes.map((t) => (t.id === editingTake.id ? updatedTake : t))
      localStorage.setItem("digitalSlate_takes", JSON.stringify(updatedTakes))
      setTakes(updatedTakes)
    }

    setEditingTake(null)
    setTake((prev) => String(Number.parseInt(prev, 10) + 1))
    setNotes("")
    setActiveTags([])
    setCurrentTakePhotos([])
  }

  const cancelEdit = () => {
    setEditingTake(null)
    setScene("1")
    setTake("1")
    setRoll("A1")
    setNotes("")
    setActiveTags([])
    setCurrentTakePhotos([])
  }

  const handleDeleteTake = async (takeId) => {
    if (isAuthReady && db && userId) {
      try {
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/takes/${takeId}`))
      } catch (error) {
        console.error("Error deleting from Firebase:", error)
        const localTakes = JSON.parse(localStorage.getItem("digitalSlate_takes") || "[]")
        const updatedTakes = localTakes.filter((t) => t.id !== takeId)
        localStorage.setItem("digitalSlate_takes", JSON.stringify(updatedTakes))
        setTakes(updatedTakes)
      }
    } else {
      const localTakes = JSON.parse(localStorage.getItem("digitalSlate_takes") || "[]")
      const updatedTakes = localTakes.filter((t) => t.id !== takeId)
      localStorage.setItem("digitalSlate_takes", JSON.stringify(updatedTakes))
      setTakes(updatedTakes)
    }
  }

  const handleTimecodeSave = (newTimecodeValue) => {
    setIsEditingTimecode(false)
    if (/^\d{1,2}:\d{1,2}:\d{1,2}:\d{1,2}$/.test(newTimecodeValue)) {
      setTimecode(newTimecodeValue)
      manualTimecodeAtStartRef.current = timeToMs(newTimecodeValue, frameRate)
      manualTimeStartRef.current = performance.now()
      setIsTimecodeLive(false)
    }
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) return
    const newCustomTags = { ...tags }

    Object.keys(DEFAULT_TAGS).forEach((key) => delete newCustomTags[key])

    newCustomTags[newTagName.trim()] = {
      color: newTagColor,
      textColor: "text-white",
    }

    if (isAuthReady && db && userId) {
      await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/settings/tags`), newCustomTags)
    } else {
      localStorage.setItem("digitalSlate_tags", JSON.stringify(newCustomTags))
      setTags({ ...DEFAULT_TAGS, ...newCustomTags })
    }

    setNewTagName("")
    setNewTagColor(CUSTOM_TAG_COLORS[0].color)
    setIsTagModalOpen(false)
  }

  const handleDeleteTag = async (tagName) => {
    if (tags[tagName]?.isDefault) return

    if (isAuthReady && db && userId) {
      const currentTagsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings/tags`)
      const docSnap = await getDoc(currentTagsDocRef)
      if (docSnap.exists()) {
        const currentCustomTags = docSnap.data()
        delete currentCustomTags[tagName]
        await setDoc(currentTagsDocRef, currentCustomTags)
      }
    } else {
      const localTags = JSON.parse(localStorage.getItem("digitalSlate_tags") || "{}")
      delete localTags[tagName]
      localStorage.setItem("digitalSlate_tags", JSON.stringify(localTags))
      setTags({ ...DEFAULT_TAGS, ...localTags })
    }
  }

  const handleToggleLiveMode = () => setIsTimecodeLive(true)

  const getFilteredTakes = () => {
    if (!dateFilter.start && !dateFilter.end) return takes

    return takes.filter((take) => {
      const takeDate = new Date(take.timestamp).toISOString().slice(0, 10)
      const start = dateFilter.start || "1900-01-01"
      const end = dateFilter.end || "2100-12-31"
      return takeDate >= start && takeDate <= end
    })
  }

  const getAdvancedStats = (filteredTakes) => {
    const stats = {
      totalTakes: filteredTakes.length,
      scenesCount: new Set(filteredTakes.map((t) => t.scene)).size,
      rollsCount: new Set(filteredTakes.map((t) => t.roll)).size,
      tagsCount: {},
      dailyStats: {},
      sceneStats: {},
      averageNotesLength: 0,
    }

    filteredTakes.forEach((take) => {
      ;(take.tags || []).forEach((tag) => {
        stats.tagsCount[tag] = (stats.tagsCount[tag] || 0) + 1
      })

      const date = new Date(take.timestamp).toISOString().slice(0, 10)
      stats.dailyStats[date] = (stats.dailyStats[date] || 0) + 1

      stats.sceneStats[take.scene] = (stats.sceneStats[take.scene] || 0) + 1

      stats.averageNotesLength += (take.notes || "").length
    })

    stats.averageNotesLength = Math.round(stats.averageNotesLength / filteredTakes.length) || 0

    return stats
  }

  // Generate PDF function (extracted for reuse)
  const generatePDF = async () => {
    const filteredTakes = getFilteredTakes()
    if (filteredTakes.length === 0) return null

    const colorScheme = PDF_COLOR_SCHEMES[selectedColorScheme]

    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const margin = 15
      const contentWidth = pageWidth - margin * 2
      let yPosition = 20

      // Header
      doc.setFillColor(...colorScheme.primary)
      doc.rect(0, 0, pageWidth, 45, "F")

      if (projectInfo.logo) {
        try {
          doc.addImage(projectInfo.logo, "JPEG", margin, 8, 35, 30)
        } catch (error) {
          console.warn("⚠️ Erro ao adicionar logo:", error)
        }
      }

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(28)
      doc.setFont("helvetica", "bold")
      const titleX = projectInfo.logo ? 55 : margin
      doc.text("🎬 RELATÓRIO DE TAKES", titleX, 22)

      doc.setFontSize(14)
      doc.setFont("helvetica", "normal")
      doc.text(`${projectInfo.scriptTitle || "Projeto de Filmagem"}`, titleX, 32)

      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      const filterText =
        dateFilter.start || dateFilter.end
          ? `Período: ${dateFilter.start || "Início"} - ${dateFilter.end || "Fim"}`
          : "Todos os períodos"
      doc.text(filterText, titleX, 38)

      yPosition = 60

      // Project Information
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, yPosition - 5, contentWidth, 50, "F")

      doc.setTextColor(31, 41, 55)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("INFORMAÇÕES DO PROJETO", margin + 5, yPosition + 8)

      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")

      const projectData = [
        { label: "Título:", value: projectInfo.scriptTitle || "N/A" },
        { label: "Diretor:", value: projectInfo.director || "N/A" },
        { label: "Continuísta:", value: projectInfo.scriptSupervisor || "N/A" },
        { label: "Produtora:", value: projectInfo.productionCompany || "N/A" },
        { label: "Data de Gravação:", value: new Date(projectInfo.recordingDate).toLocaleDateString("pt-BR") },
        { label: "Total de Takes:", value: filteredTakes.length.toString() },
        { label: "Relatório Gerado:", value: new Date().toLocaleString("pt-BR") },
      ]

      const leftColumn = projectData.slice(0, 4)
      const rightColumn = projectData.slice(4)

      leftColumn.forEach((item, index) => {
        const y = yPosition + 18 + index * 7
        doc.setFont("helvetica", "bold")
        doc.text(item.label, margin + 5, y)
        doc.setFont("helvetica", "normal")
        doc.text(item.value, margin + 35, y)
      })

      rightColumn.forEach((item, index) => {
        const y = yPosition + 18 + index * 7
        doc.setFont("helvetica", "bold")
        doc.text(item.label, margin + contentWidth / 2 + 5, y)
        doc.setFont("helvetica", "normal")
        doc.text(item.value, margin + contentWidth / 2 + 45, y)
      })

      yPosition += 65

      // Takes Table
      if (yPosition > pageHeight - 100) {
        doc.addPage()
        yPosition = 20
      }

      doc.setTextColor(31, 41, 55)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("REGISTRO DE TAKES", margin, yPosition)
      yPosition += 15

      doc.setFillColor(...colorScheme.secondary)
      doc.rect(margin, yPosition, contentWidth, 15, "F")

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")

      const columns = [
        { title: "CENA", x: margin + 5, width: 25 },
        { title: "TAKE", x: margin + 35, width: 25 },
        { title: "ROLO", x: margin + 65, width: 30 },
        { title: "TIMECODE", x: margin + 100, width: 40 },
        { title: "TAGS", x: margin + 145, width: 35 },
        { title: "OBSERVAÇÕES", x: margin + 185, width: 50 },
      ]

      columns.forEach((col) => {
        doc.text(col.title, col.x, yPosition + 10)
      })

      yPosition += 20

      doc.setTextColor(31, 41, 55)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)

      filteredTakes.forEach((take, index) => {
        if (yPosition > pageHeight - 60) {
          doc.addPage()
          yPosition = 20

          doc.setFillColor(...colorScheme.secondary)
          doc.rect(margin, yPosition, contentWidth, 15, "F")
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(11)
          doc.setFont("helvetica", "bold")
          doc.text("CENA", margin + 5, yPosition + 10)
          doc.text("TAKE", margin + 35, yPosition + 10)
          doc.text("ROLO", margin + 65, yPosition + 10)
          doc.text("TIMECODE", margin + 100, yPosition + 10)
          doc.text("TAGS", margin + 145, yPosition + 10)
          yPosition += 20
          doc.setTextColor(31, 41, 55)
          doc.setFont("helvetica", "normal")
          doc.setFontSize(10)
        }

        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margin, yPosition - 2, contentWidth, 25, "F")
        }

        doc.setFont("helvetica", "bold")
        doc.text(`Cena ${take.scene} - Take ${take.take}`, margin + 5, yPosition + 8)
        doc.setFont("helvetica", "normal")
        doc.text(take.roll || "N/A", margin + 65, yPosition + 8)
        doc.text(take.timecode || "N/A", margin + 100, yPosition + 8)

        if (take.tags && take.tags.length > 0) {
          doc.setFontSize(9)
          doc.setTextColor(80, 80, 80)
          doc.text(`Tags: ${take.tags.join(", ")}`, margin + 5, yPosition + 15)
          doc.setFontSize(10)
          doc.setTextColor(31, 41, 55)
        }

        yPosition += 25

        if (take.notes && take.notes.trim()) {
          doc.setFontSize(9)
          doc.setFont("helvetica", "italic")
          doc.setTextColor(60, 60, 60)
          doc.text("Observações:", margin + 5, yPosition + 5)

          const splitNotes = doc.splitTextToSize(take.notes, contentWidth - 20)
          doc.text(splitNotes, margin + 10, yPosition + 12)
          yPosition += splitNotes.length * 4 + 10

          doc.setFont("helvetica", "normal")
          doc.setTextColor(31, 41, 55)
          doc.setFontSize(10)
        }

        if (take.photos && take.photos.length > 0) {
          doc.setFontSize(9)
          doc.setTextColor(80, 80, 80)
          doc.text(`Fotos: ${take.photos.length} anexada(s)`, margin + 5, yPosition + 5)

          let photoX = margin + 10
          take.photos.forEach((photo, photoIndex) => {
            if (photoX + 30 > pageWidth - margin) {
              photoX = margin + 10
              yPosition += 35
            }

            try {
              doc.addImage(photo.data, "JPEG", photoX, yPosition + 8, 25, 25)
              photoX += 30
            } catch (error) {
              console.warn("Erro ao adicionar foto ao PDF:", error)
            }
          })

          yPosition += 35
          doc.setFontSize(10)
          doc.setTextColor(31, 41, 55)
        }

        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text(new Date(take.timestamp).toLocaleString("pt-BR"), pageWidth - 80, yPosition + 5)

        yPosition += 15

        doc.setDrawColor(200, 200, 200)
        doc.line(margin, yPosition, pageWidth - margin, yPosition)
        yPosition += 10
      })

      if (showAdvancedStats && filteredTakes.length > 0) {
        doc.addPage()
        yPosition = 20

        const stats = getAdvancedStats(filteredTakes)

        doc.setFillColor(...colorScheme.primary)
        doc.rect(0, 0, pageWidth, 40, "F")

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(24)
        doc.setFont("helvetica", "bold")
        doc.text("📊 ESTATÍSTICAS DETALHADAS", margin, 25)

        yPosition = 55

        const statBoxes = [
          { label: "Total de Takes", value: stats.totalTakes, color: colorScheme.accent, desc: "takes registrados" },
          {
            label: "Cenas Filmadas",
            value: stats.scenesCount,
            color: colorScheme.secondary,
            desc: "cenas diferentes",
          },
          { label: "Rolos Utilizados", value: stats.rollsCount, color: colorScheme.primary, desc: "rolos de filme" },
        ]

        statBoxes.forEach((stat, index) => {
          const x = margin + index * 60

          doc.setFillColor(...stat.color)
          doc.rect(x, yPosition, 55, 35, "F")

          doc.setTextColor(255, 255, 255)
          doc.setFontSize(20)
          doc.setFont("helvetica", "bold")
          doc.text(stat.value.toString(), x + 27.5, yPosition + 18, { align: "center" })

          doc.setFontSize(9)
          doc.setFont("helvetica", "bold")
          doc.text(stat.label, x + 27.5, yPosition + 26, { align: "center" })

          doc.setFontSize(7)
          doc.setFont("helvetica", "normal")
          doc.text(stat.desc, x + 27.5, yPosition + 31, { align: "center" })
        })

        yPosition += 50

        if (Object.keys(stats.tagsCount).length > 0) {
          doc.setTextColor(31, 41, 55)
          doc.setFontSize(16)
          doc.setFont("helvetica", "bold")
          doc.text("ANÁLISE DE TAGS", margin, yPosition)

          yPosition += 15

          const sortedTags = Object.entries(stats.tagsCount).sort(([, a], [, b]) => b - a)

          sortedTags.forEach(([tag, count], index) => {
            const percentage = Math.round((count / stats.totalTakes) * 100)
            const barWidth = (percentage / 100) * (contentWidth - 80)

            doc.setFontSize(11)
            doc.setFont("helvetica", "bold")
            doc.text(`${tag}:`, margin, yPosition + 8)

            doc.setFont("helvetica", "normal")
            doc.text(`${count} takes (${percentage}%)`, margin + 60, yPosition + 8)

            doc.setFillColor(220, 220, 220)
            doc.rect(margin + 120, yPosition + 3, contentWidth - 140, 8, "F")

            doc.setFillColor(...colorScheme.accent)
            doc.rect(margin + 120, yPosition + 3, barWidth, 8, "F")

            yPosition += 15
          })
        }
      }

      const totalPages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFillColor(...colorScheme.primary)
        doc.rect(0, pageHeight - 18, pageWidth, 18, "F")

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.text(
          `Digital Slate • ${projectInfo.productionCompany || "Produção Cinematográfica"}`,
          margin,
          pageHeight - 8,
        )
        doc.text(`Página ${i} de ${totalPages} • ${colorScheme.name}`, pageWidth - 80, pageHeight - 8)

        doc.setFontSize(7)
        doc.setTextColor(60, 60, 60)
        doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, pageHeight - 3)
      }

      return doc
    } catch (error) {
      console.error("❌ Erro ao gerar PDF:", error)
      throw error
    }
  }

  const handleExport = async (type) => {
    const filteredTakes = getFilteredTakes()
    if (filteredTakes.length === 0) return

    if (type === "csv") {
      let content = "Cena,Take,Rolo,Timecode,Tags,Anotações,Data/Hora\n"
      content += filteredTakes
        .map(
          (t) =>
            `"${t.scene}","${t.take}","${t.roll}","${t.timecode}","${(t.tags || []).join("; ")}","${t.notes || ""}","${new Date(t.timestamp).toLocaleString("pt-BR")}"`,
        )
        .join("\n")

      const filename = `takes-${projectInfo.scriptTitle || "projeto"}-${new Date().toISOString().slice(0, 10)}.csv`
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (type === "pdf") {
      try {
        const doc = await generatePDF()
        if (doc) {
          const filename = `relatorio-takes-${projectInfo.scriptTitle || "projeto"}-${new Date().toISOString().slice(0, 10)}.pdf`
          doc.save(filename)
        }
      } catch (error) {
        alert(`Erro ao gerar PDF: ${error.message}`)
      }
    } else if (type === "email") {
      // Open email modal
      setEmailData({
        to: "",
        subject: `Relatório de Takes - ${projectInfo.scriptTitle || "Projeto"}`,
        message: `Olá,\n\nSegue em anexo o relatório de takes do projeto "${projectInfo.scriptTitle || "Projeto"}".\n\nDetalhes do projeto:\n- Diretor: ${projectInfo.director || "N/A"}\n- Data de Gravação: ${new Date(projectInfo.recordingDate).toLocaleDateString("pt-BR")}\n- Total de Takes: ${filteredTakes.length}\n\nAtenciosamente,\n${emailData.senderName || "Equipe de Produção"}`,
        senderName: emailData.senderName || "",
        senderEmail: emailData.senderEmail || "",
      })
      setIsEmailModalOpen(true)
      return
    }

    setIsExportModalOpen(false)
  }

  const handleSendEmail = async () => {
    if (!emailData.to || !emailData.senderName || !emailData.senderEmail) {
      alert("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    setIsEmailSending(true)
    setEmailStatus(null)

    try {
      // Generate PDF
      const doc = await generatePDF()
      if (!doc) {
        throw new Error("Erro ao gerar PDF")
      }

      // Convert PDF to base64
      const pdfBase64 = doc.output("datauristring").split(",")[1]

      // Prepare email data
      const templateParams = {
        to_email: emailData.to,
        from_name: emailData.senderName,
        from_email: emailData.senderEmail,
        subject: emailData.subject,
        message: emailData.message,
        project_title: projectInfo.scriptTitle || "Projeto",
        director: projectInfo.director || "N/A",
        recording_date: new Date(projectInfo.recordingDate).toLocaleDateString("pt-BR"),
        total_takes: getFilteredTakes().length,
        pdf_attachment: pdfBase64,
        filename: `relatorio-takes-${projectInfo.scriptTitle || "projeto"}-${new Date().toISOString().slice(0, 10)}.pdf`,
      }

      // Send email using EmailJS
      const response = await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        templateParams,
        EMAILJS_CONFIG.publicKey,
      )

      console.log("Email enviado com sucesso:", response)
      setEmailStatus("success")

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsEmailModalOpen(false)
        setEmailStatus(null)
      }, 2000)
    } catch (error) {
      console.error("Erro ao enviar email:", error)
      setEmailStatus("error")
    } finally {
      setIsEmailSending(false)
    }
  }

  useEffect(() => {
    if (isAuthReady && (!db || !userId)) {
      const localTakes = JSON.parse(localStorage.getItem("digitalSlate_takes") || "[]")
      const localProjectInfo = JSON.parse(localStorage.getItem("digitalSlate_projectInfo") || "{}")
      const localTags = JSON.parse(localStorage.getItem("digitalSlate_tags") || "{}")

      setTakes(localTakes)
      if (Object.keys(localProjectInfo).length > 0) {
        setProjectInfo({ ...projectInfo, ...localProjectInfo })
      }
      if (Object.keys(localTags).length > 0) {
        setTags({ ...DEFAULT_TAGS, ...localTags })
      }
    }
  }, [isAuthReady, db, userId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header moderno */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Clapperboard size={32} className="text-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                    Digital Slate
                  </h1>
                  <p className="text-xs text-slate-400">Professional Film Tool</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Status indicator */}
              {isAuthReady && (
                <div className="flex items-center space-x-2">
                  <div
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                      db && userId
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        db && userId ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"
                      }`}
                    ></div>
                    <span>{db && userId ? "Online" : "Offline"}</span>
                  </div>
                </div>
              )}

              {userId && (
                <div className="text-xs text-slate-500 font-mono bg-slate-800/50 px-2 py-1 rounded">
                  {userId.slice(0, 8)}...
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {!isAuthReady && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto"></div>
              <Sparkles
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-400"
                size={24}
              />
            </div>
            <p className="text-slate-400">Conectando ao serviço...</p>
          </div>
        </div>
      )}

      {isAuthReady && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Project Info Card */}
          <div className="mb-8 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="text-slate-400" size={20} />
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Informações do Projeto</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <input
                name="scriptTitle"
                value={projectInfo.scriptTitle}
                onChange={handleProjectInfoChange}
                placeholder="Título do Roteiro"
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:outline-none transition-all placeholder-slate-500"
              />
              <input
                name="recordingDate"
                type="date"
                value={projectInfo.recordingDate}
                onChange={handleProjectInfoChange}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:outline-none transition-all"
              />
              <input
                name="director"
                value={projectInfo.director}
                onChange={handleProjectInfoChange}
                placeholder="Diretor(a)"
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:outline-none transition-all placeholder-slate-500"
              />
              <input
                name="scriptSupervisor"
                value={projectInfo.scriptSupervisor}
                onChange={handleProjectInfoChange}
                placeholder="Continuísta"
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:outline-none transition-all placeholder-slate-500"
              />
              <input
                name="productionCompany"
                value={projectInfo.productionCompany}
                onChange={handleProjectInfoChange}
                placeholder="Produtora"
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:outline-none transition-all placeholder-slate-500"
              />
            </div>

            <div className="mt-6 flex items-center space-x-4">
              <label className="flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-xl cursor-pointer transition-all border border-blue-500/30 hover:border-blue-500/50">
                <ImageIcon size={16} />
                <span className="text-sm font-medium">Upload Logo</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {projectInfo.logo && (
                <div className="flex items-center space-x-2">
                  <img
                    src={projectInfo.logo || "/placeholder.svg"}
                    alt="Logo"
                    className="w-8 h-8 object-contain rounded-lg border border-slate-700/50"
                  />
                  <span className="text-sm text-emerald-400 flex items-center space-x-1">
                    <Zap size={14} />
                    <span>Logo carregado</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Controls */}
            <div className="space-y-6">
              {/* Timecode Card */}
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="text-emerald-400" size={20} />
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Timecode</h2>
                  </div>
                  <button
                    onClick={handleToggleLiveMode}
                    disabled={isTimecodeLive}
                    className={`flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
                      isTimecodeLive
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50"
                    }`}
                  >
                    {isTimecodeLive ? (
                      <>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <span>Live</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={12} />
                        <span>Sync</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative bg-black/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50 group">
                  {isEditingTimecode ? (
                    <input
                      type="text"
                      defaultValue={timecode}
                      onBlur={(e) => handleTimecodeSave(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.target.blur()
                      }}
                      autoFocus
                      className="w-full bg-transparent text-4xl md:text-5xl font-mono text-center text-emerald-400 tracking-widest focus:outline-none"
                    />
                  ) : (
                    <p
                      onClick={() => setIsEditingTimecode(true)}
                      className={`text-4xl md:text-5xl font-mono tracking-widest cursor-pointer text-center transition-all ${
                        isTimecodeLive ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {timecode}
                    </p>
                  )}
                  <Edit
                    size={16}
                    className="absolute top-4 right-4 text-slate-600 group-hover:text-emerald-400 transition-colors cursor-pointer"
                    onClick={() => setIsEditingTimecode(true)}
                  />
                </div>
              </div>

              {/* Take Data Card */}
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 flex-grow">
                <div className="flex items-center space-x-2 mb-4">
                  <Film className="text-blue-400" size={20} />
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Dados do Take</h2>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-medium">Cena</label>
                    <input
                      type="text"
                      value={scene}
                      onChange={(e) => setScene(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:outline-none transition-all text-center font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-medium">Take</label>
                    <input
                      type="number"
                      min="1"
                      value={take}
                      onChange={(e) => setTake(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:outline-none transition-all text-center font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-medium">Rolo</label>
                    <input
                      type="text"
                      value={roll}
                      onChange={(e) => setRoll(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:outline-none transition-all text-center font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-medium">Observações</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:outline-none transition-all placeholder-slate-500 resize-none"
                      placeholder="Anotações sobre o take..."
                    />
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Tag className="text-purple-400" size={16} />
                        <label className="text-xs text-slate-400 font-medium">Tags</label>
                      </div>
                      <button
                        onClick={() => setIsTagModalOpen(true)}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(tags).map(([name, style]) => (
                        <div key={name} className="relative group">
                          <button
                            onClick={() => handleToggleTag(name)}
                            className={`px-3 py-1.5 text-sm rounded-full cursor-pointer transition-all font-medium ${
                              activeTags.includes(name)
                                ? `${style.color} ${style.textColor} ring-2 ring-offset-2 ring-offset-slate-900 ring-white/20 shadow-lg`
                                : "bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 border border-slate-600/50"
                            }`}
                          >
                            {name}
                          </button>
                          {!style.isDefault && (
                            <button
                              onClick={() => handleDeleteTag(name)}
                              className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={8} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Photos Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ImageIcon className="text-pink-400" size={16} />
                        <label className="text-xs text-slate-400 font-medium">Fotos</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={startCamera} className="text-pink-400 hover:text-pink-300 transition-colors">
                          <Camera size={16} />
                        </button>
                        <label className="text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">
                          <Upload size={16} />
                          <input
                            id="photo-input"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {currentTakePhotos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {currentTakePhotos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <img
                              src={photo.data || "/placeholder.svg"}
                              alt="Foto do take"
                              className="w-16 h-16 object-cover rounded-xl border-2 border-slate-700/50 group-hover:border-pink-400/50 transition-all"
                            />
                            <button
                              onClick={() => removePhoto(photo.id)}
                              className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {editingTake ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleUpdateTake}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center space-x-3 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Edit size={20} />
                    <span>Atualizar Take</span>
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-bold py-4 px-6 rounded-2xl transition-all duration-200"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogTake}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center space-x-3 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Clapperboard size={20} />
                  <span>Bater Claquete & Salvar Take</span>
                </button>
              )}
            </div>

            {/* Right Column: History */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="text-cyan-400" size={20} />
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Histórico de Takes</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsCustomizeModalOpen(true)}
                    className="flex items-center space-x-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-medium py-2 px-3 rounded-xl transition-all border border-purple-500/30 hover:border-purple-500/50"
                  >
                    <Palette size={14} />
                    <span>Personalizar</span>
                  </button>
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center space-x-2 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium py-2 px-3 rounded-xl transition-all border border-blue-500/30 hover:border-blue-500/50"
                  >
                    <Download size={14} />
                    <span>Exportar</span>
                  </button>
                </div>
              </div>

              {/* Date Filter */}
              <div className="mb-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <div className="flex items-center space-x-2 mb-3">
                  <Calendar size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-400 font-medium">Filtrar por período</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={dateFilter.start}
                    onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
                    className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all"
                  />
                  <input
                    type="date"
                    value={dateFilter.end}
                    onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
                    className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all"
                  />
                </div>
                {(dateFilter.start || dateFilter.end) && (
                  <button
                    onClick={() => setDateFilter({ start: "", end: "" })}
                    className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              {/* Takes List */}
              <div className="flex-grow overflow-y-auto space-y-4 max-h-96 lg:max-h-none">
                {getFilteredTakes().length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center space-y-2">
                      <Film size={48} className="mx-auto text-slate-600" />
                      <p>
                        {takes.length === 0
                          ? "Nenhum take registrado ainda."
                          : "Nenhum take encontrado no período selecionado."}
                      </p>
                    </div>
                  </div>
                ) : (
                  getFilteredTakes().map((t, index) => (
                    <div
                      key={t.id}
                      className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-grow space-y-3">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span className="font-bold text-lg text-white">
                              Cena {t.scene} - Take {t.take}
                            </span>
                            <span className="text-sm text-slate-400 bg-slate-700/50 px-2 py-1 rounded-lg">
                              Rolo: {t.roll}
                            </span>
                            <span
                              className={`font-mono text-sm px-2 py-1 rounded-lg ${
                                t.timecode === timecode && !isTimecodeLive
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {t.timecode}
                            </span>
                          </div>

                          {t.notes && (
                            <p className="text-sm text-slate-300 bg-slate-700/30 p-3 rounded-lg italic border-l-4 border-blue-400/50">
                              "{t.notes}"
                            </p>
                          )}

                          {t.tags && t.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {t.tags.map((tag) => {
                                const style = tags[tag] || {
                                  color: "bg-slate-500",
                                  textColor: "text-white",
                                }
                                return (
                                  <span
                                    key={tag}
                                    className={`px-2 py-1 text-xs rounded-full font-medium ${style.color} ${style.textColor}`}
                                  >
                                    {tag}
                                  </span>
                                )
                              })}
                            </div>
                          )}

                          {t.photos && t.photos.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {t.photos.map((photo) => (
                                <img
                                  key={photo.id}
                                  src={photo.data || "/placeholder.svg"}
                                  alt="Foto do take"
                                  className="w-12 h-12 object-cover rounded-lg border border-slate-600/50 hover:border-pink-400/50 transition-all"
                                />
                              ))}
                            </div>
                          )}

                          <p className="text-xs text-slate-500 text-right">
                            {new Date(t.timestamp).toLocaleString("pt-BR")}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditTake(t)}
                            className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTake(t.id)}
                            className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Tag Creation Modal */}
      {isTagModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Criar Nova Tag</h2>
              <button
                onClick={() => setIsTagModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nome da Tag</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Digite o nome da tag"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 focus:outline-none transition-all placeholder-slate-500"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Cor da Tag</label>
                <div className="grid grid-cols-6 gap-3">
                  {CUSTOM_TAG_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setNewTagColor(color.color)}
                      className={`w-12 h-12 rounded-xl ${color.color} transition-all transform hover:scale-110 ${
                        newTagColor === color.color
                          ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-white/50 shadow-lg"
                          : "hover:shadow-lg"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={() => setIsTagModalOpen(false)}
                className="py-2 px-4 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-xl transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTag}
                className="py-2 px-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl transition-all font-medium"
              >
                Adicionar Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customize Modal */}
      {isCustomizeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Palette size={24} className="text-purple-400" />
                <h2 className="text-xl font-bold text-white">Personalizar Relatório</h2>
              </div>
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Esquema de Cores</label>
                <div className="space-y-3">
                  {Object.entries(PDF_COLOR_SCHEMES).map(([key, scheme]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedColorScheme(key)}
                      className={`w-full p-4 rounded-xl border-2 transition-all ${
                        selectedColorScheme === key
                          ? "border-purple-400/50 bg-purple-500/10"
                          : "border-slate-700/50 hover:border-slate-600/50 bg-slate-800/30"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: `rgb(${scheme.primary.join(",")})` }}
                          ></div>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: `rgb(${scheme.secondary.join(",")})` }}
                          ></div>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: `rgb(${scheme.accent.join(",")})` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-white">{scheme.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <input
                  type="checkbox"
                  id="advancedStats"
                  checked={showAdvancedStats}
                  onChange={(e) => setShowAdvancedStats(e.target.checked)}
                  className="w-4 h-4 text-purple-400 bg-slate-700 border-slate-600 rounded focus:ring-purple-400/50"
                />
                <label
                  htmlFor="advancedStats"
                  className="text-sm font-medium text-slate-300 flex items-center space-x-2"
                >
                  <BarChart3 size={16} className="text-cyan-400" />
                  <span>Incluir Estatísticas Avançadas</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="py-2 px-4 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-xl transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="py-2 px-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl transition-all font-medium"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Download size={24} className="text-blue-400" />
                <h2 className="text-xl font-bold text-white">Exportar & Enviar Relatórios</h2>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <p className="text-sm text-slate-300 font-medium">
                  <strong>Filtros ativos:</strong> {getFilteredTakes().length} de {takes.length} takes
                </p>
                {(dateFilter.start || dateFilter.end) && (
                  <p className="text-xs text-slate-400 mt-1">
                    Período: {dateFilter.start || "Início"} - {dateFilter.end || "Fim"}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full flex items-center space-x-4 p-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl transition-all group"
                >
                  <FileText size={24} className="text-emerald-400" />
                  <div className="text-left">
                    <div className="font-semibold text-emerald-400">Planilha CSV</div>
                    <div className="text-sm text-emerald-300/70">Para Excel, Google Sheets, etc.</div>
                  </div>
                </button>

                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full flex items-center space-x-4 p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 hover:border-purple-500/50 rounded-xl transition-all group"
                >
                  <FileText size={24} className="text-purple-400" />
                  <div className="text-left">
                    <div className="font-semibold text-purple-400">Relatório PDF Profissional</div>
                    <div className="text-sm text-purple-300/70">
                      {PDF_COLOR_SCHEMES[selectedColorScheme].name} • {showAdvancedStats ? "Com" : "Sem"} estatísticas
                      avançadas
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleExport("email")}
                  className="w-full flex items-center space-x-4 p-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/50 rounded-xl transition-all group"
                >
                  <Mail size={24} className="text-cyan-400" />
                  <div className="text-left">
                    <div className="font-semibold text-cyan-400">Enviar por Email</div>
                    <div className="text-sm text-cyan-300/70">PDF anexado automaticamente</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="py-2 px-4 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-xl transition-all font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Mail size={24} className="text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Enviar Relatório por Email</h2>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {emailStatus === "success" && (
              <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center space-x-3">
                <CheckCircle className="text-emerald-400" size={20} />
                <div>
                  <p className="text-emerald-400 font-medium">Email enviado com sucesso!</p>
                  <p className="text-emerald-300/70 text-sm">O relatório foi enviado para {emailData.to}</p>
                </div>
              </div>
            )}

            {emailStatus === "error" && (
              <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center space-x-3">
                <AlertCircle className="text-rose-400" size={20} />
                <div>
                  <p className="text-rose-400 font-medium">Erro ao enviar email</p>
                  <p className="text-rose-300/70 text-sm">Verifique os dados e tente novamente</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Seu Nome *</label>
                  <input
                    type="text"
                    value={emailData.senderName}
                    onChange={(e) => setEmailData((prev) => ({ ...prev, senderName: e.target.value }))}
                    placeholder="Seu nome completo"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all placeholder-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Seu Email *</label>
                  <input
                    type="email"
                    value={emailData.senderEmail}
                    onChange={(e) => setEmailData((prev) => ({ ...prev, senderEmail: e.target.value }))}
                    placeholder="seu@email.com"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Destinatário *</label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData((prev) => ({ ...prev, to: e.target.value }))}
                  placeholder="destinatario@email.com"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all placeholder-slate-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Assunto</label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Mensagem</label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData((prev) => ({ ...prev, message: e.target.value }))}
                  rows={6}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all placeholder-slate-500 resize-none"
                />
              </div>

              <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <p className="text-sm text-slate-400 mb-2">📎 Anexo incluído:</p>
                <p className="text-sm text-slate-300 font-medium">
                  relatorio-takes-{projectInfo.scriptTitle || "projeto"}-{new Date().toISOString().slice(0, 10)}.pdf
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {getFilteredTakes().length} takes • {PDF_COLOR_SCHEMES[selectedColorScheme].name}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="py-2 px-4 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-xl transition-all font-medium"
                disabled={isEmailSending}
              >
                Cancelar
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isEmailSending || !emailData.to || !emailData.senderName || !emailData.senderEmail}
                className="py-2 px-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isEmailSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Enviar Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {cameraActive && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Camera className="text-pink-400" size={24} />
                <span>Capturar Foto</span>
              </h2>
              <button onClick={stopCamera} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover rounded-xl bg-black border border-slate-700/50"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={capturePhoto}
                  className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95"
                >
                  📸 Capturar
                </button>
                <button
                  onClick={stopCamera}
                  className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-bold py-3 px-6 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
