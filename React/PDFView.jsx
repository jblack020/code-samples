import { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString()

export const PDFView = ({ pdfURL }) => {
  const [numPages, setNumPages] = useState(null)
  const [pageVisible, setPageVisible] = useState(true)
  const [scale, setScale] = useState(1.0)
  const [newScale, setNewScale] = useState(1.0)

  // Config variables
  const initialWidth = 405
  const stepSize = 0.5
  const magnifierMax = 4

  // Extreme controls
  const minWidth = initialWidth / magnifierMax
  const maxWidth = initialWidth * magnifierMax

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
  }

  useEffect(() => {
    const handleZoom = (_event, action) => {
      switch (action) {
        case 'zoom-in':
          scaleUp()
          break
        case 'zoom-out':
          scaleDown()
          break
        case 'zoom-reset':
          scaleReset()
          break
      }
    }
    console.log('Adding menu action listener')
    window.electronAPI.onMenuAction(handleZoom)

    return () => {
      window.electronAPI.removeMenuActionListener()
    }
  }, [])

  const scaleUp = () => {
    setNewScale((prevScale) => Math.min(prevScale + stepSize, maxWidth / initialWidth))
  }

  const scaleDown = () => {
    setNewScale((prevScale) => Math.max(prevScale - stepSize, minWidth / initialWidth))
  }

  const scaleReset = () => {
    const windowWidth = window.innerWidth
    setNewScale((windowWidth * 0.45) / initialWidth)
  }

  useEffect(() => {
    scaleReset()
  }, [])

  const isLoading = newScale !== scale

  return (
    <Document file={pdfURL} onLoadSuccess={onDocumentLoadSuccess}>
      {numPages &&
        Array.from(new Array(numPages), (_el, index) => (
          <div key={`page_div_${index}`}>
            <Page
              className={`mb-2 ${pageVisible ? 'visible' : 'hidden'}`}
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              scale={pageVisible ? scale : newScale}
              width={initialWidth}
              onRenderSuccess={
                pageVisible
                  ? null
                  : () => {
                      if (isLoading) {
                        setPageVisible(!pageVisible)
                        setScale(newScale)
                      }
                    }
              }
            />
            <Page
              className={`mb-2 ${pageVisible ? 'hidden' : 'visible'}`}
              key={`pages_${index + 1}`}
              pageNumber={index + 1}
              scale={pageVisible ? newScale : scale}
              width={initialWidth}
              onRenderSuccess={
                pageVisible
                  ? () => {
                      if (isLoading) {
                        console.log(
                          'this is new scale: ' + newScale + ' and this is scale: ' + scale
                        )
                        setPageVisible(!pageVisible)
                        setScale(newScale)
                      }
                    }
                  : null
              }
            />
          </div>
        ))}
    </Document>
  )
}

// Have two pages, positioned on top of each other. One is hidden.
// When the user changes the scale, it effects the hidden page.
// Once the hidden page renders the scale change, it becomes triggers the visible page to hide,
// and turns itself visible. If the user scales again, this process repeats itself.
