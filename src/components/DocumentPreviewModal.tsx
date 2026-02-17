import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import './DocumentPreviewModal.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface DocumentPreviewModalProps {
    fileUrl: string | null;
    fileName: string;
    onClose: () => void;
}

export default function DocumentPreviewModal({ fileUrl, fileName, onClose }: DocumentPreviewModalProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.2);

    const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
        setNumPages(n);
        setCurrentPage(1);
    }, []);

    if (!fileUrl) return null;

    const isPdf = fileName.toLowerCase().endsWith('.pdf') || !fileName.includes('.');

    return (
        <div className="doc-preview-overlay" onClick={onClose}>
            <div className="doc-preview-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="doc-preview__header">
                    <span className="doc-preview__title">{fileName}</span>
                    <button className="doc-preview__close" onClick={onClose}><X /></button>
                </div>

                {/* Toolbar */}
                {isPdf && numPages > 0 && (
                    <div className="doc-preview__toolbar">
                        <div className="doc-preview__nav">
                            <button
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage((p) => p - 1)}
                            >
                                <ChevronLeft />
                            </button>
                            <span className="doc-preview__page-info">
                                {currentPage} / {numPages}
                            </span>
                            <button
                                disabled={currentPage >= numPages}
                                onClick={() => setCurrentPage((p) => p + 1)}
                            >
                                <ChevronRight />
                            </button>
                        </div>
                        <div className="doc-preview__zoom">
                            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} title="Reducir">
                                <ZoomOut />
                            </button>
                            <span className="doc-preview__zoom-level">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale((s) => Math.min(3, s + 0.2))} title="Ampliar">
                                <ZoomIn />
                            </button>
                            <button onClick={() => setScale(1.2)} title="Restablecer">
                                <Maximize2 />
                            </button>
                        </div>
                    </div>
                )}

                {/* Viewer */}
                <div className="doc-preview__body">
                    {isPdf ? (
                        <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                        >
                            <Page
                                pageNumber={currentPage}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        </Document>
                    ) : (
                        <iframe
                            src={fileUrl}
                            className="doc-preview__iframe"
                            title={fileName}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
