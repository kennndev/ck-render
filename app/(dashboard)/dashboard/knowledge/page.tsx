'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Bot, ArrowLeft, FileText, Upload, Trash2, RefreshCw,
  File, FileSpreadsheet, FileCode, Search, Database,
  CheckCircle2, AlertCircle, Clock
} from 'lucide-react'

interface KnowledgeDoc {
  id: string
  name: string
  type: string
  size: number
  chunks: number
  status: 'processing' | 'ready' | 'error'
  uploadedAt: string
}

export default function KnowledgePage() {
  const router = useRouter()
  const [instance, setInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    fetch('/api/instance/status')
      .then(r => r.json())
      .then(data => {
        setInstance(data.instance)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (instance) fetchDocuments()
  }, [instance])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/instance/knowledge')
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      }
    } catch {
      // Knowledge API may not be available
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/instance/knowledge', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          await fetchDocuments()
        }
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const deleteDocument = async (docId: string) => {
    if (!confirm('Delete this document from the knowledge base?')) return
    try {
      await fetch('/api/instance/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      })
      await fetchDocuments()
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText
    if (type.includes('csv') || type.includes('spreadsheet')) return FileSpreadsheet
    if (type.includes('code') || type.includes('json') || type.includes('markdown')) return FileCode
    return File
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Bot className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No instance found. Deploy your bot first.</p>
      </div>
    )
  }

  const totalChunks = documents.reduce((sum, d) => sum + d.chunks, 0)
  const readyDocs = documents.filter(d => d.status === 'ready').length

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <h1 className="text-lg font-bold">Knowledge Base</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Database className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{documents.length}</p>
              <p className="text-xs text-gray-500">Documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalChunks}</p>
              <p className="text-xs text-gray-500">Text Chunks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{readyDocs}</p>
              <p className="text-xs text-gray-500">Indexed</p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Documents
            </CardTitle>
            <CardDescription>
              Upload files to build your bot's knowledge base. Supported: PDF, TXT, CSV, MD, JSON.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                dragActive
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div>
                  <RefreshCw className="h-10 w-10 mx-auto mb-3 text-purple-600 animate-spin" />
                  <p className="text-sm font-medium">Processing...</p>
                  <p className="text-xs text-gray-500 mt-1">Chunking and indexing your documents</p>
                </div>
              ) : (
                <div>
                  <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium">Drag & drop files here</p>
                  <p className="text-xs text-gray-500 mt-1 mb-3">or click to browse</p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    multiple
                    accept=".pdf,.txt,.csv,.md,.json,.doc,.docx"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Browse Files
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span>Max 10MB per file</span>
              <span>PDF, TXT, CSV, MD, JSON</span>
              <span>Auto-chunked for RAG</span>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Documents</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchDocuments}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Database className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No documents yet</p>
                <p className="text-sm mt-1">Upload documents to give your bot specialized knowledge</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => {
                  const Icon = getFileIcon(doc.type)
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Icon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{doc.name}</span>
                            <Badge
                              variant={
                                doc.status === 'ready' ? 'default' :
                                doc.status === 'processing' ? 'secondary' : 'destructive'
                              }
                              className="text-xs"
                            >
                              {doc.status === 'ready' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {doc.status === 'processing' && <Clock className="h-3 w-3 mr-1" />}
                              {doc.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {doc.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span>{formatSize(doc.size)}</span>
                            <span>{doc.chunks} chunks</span>
                            <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDocument(doc.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How RAG Works */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-purple-600" />
              How Knowledge Base Works
            </h4>
            <div className="grid md:grid-cols-3 gap-4 text-xs text-gray-600">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-1">1. Upload</p>
                <p>Upload documents in PDF, TXT, CSV, or Markdown format. Files are automatically parsed.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-1">2. Index</p>
                <p>Documents are split into chunks, embedded as vectors, and indexed for fast retrieval.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-1">3. Retrieve</p>
                <p>When users ask questions, relevant chunks are retrieved and included in the bot's context.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
