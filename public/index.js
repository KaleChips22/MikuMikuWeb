const VERSION = '1.3.0'

document.getElementById("version").innerText = VERSION

const canvas = document.getElementById("editor")
const ctx = canvas.getContext("2d")

let editorScalar = document.querySelector('.editor')

let width, height

let yScale = 4
let xScale = 30

let divisions = 32

let mouseDown = false

let currentNoteSize = 3

let cNote = null
let lNote = null

let selection = null
let selectionArea = {
    start: [null, null],
    end: [null, null]
}

let currentName = null

let playOff = 0

let isResizeLeft = false
let isResizeRight = false

let playing = false

let audioElem = new Audio()

let metaData = {
    title: null,
    artist: null,
    designer: null,
    jacket: null,
    musicFile: null,
    musicOffset: null,
    baseBPM: 120
}

let currentBPM = metaData.baseBPM
let prevBPM = 120

let mouseX, mouseY
canvas.onmousemove = e => {
    mouseX = e.offsetX
    mouseY = e.offsetY
}

const TOOLS = {
    MOUSE: 0,
    TAP: 1,
    HOLD: 2,
    STEP: 3,
    FLICK: 4,
    CRIT: 5,
    TRACE: 6,
    GUIDE: 7,
    DAMAGE: 8,
    BPM: 9,
    TSIG: 10,
    HISPEED: 11
}

let currentTool = TOOLS.MOUSE

let offsetY = 0

document.addEventListener("wheel", e => {
    offsetY -= e.deltaY

    offsetY = Math.max(offsetY, -100.25)
});

([...document.querySelectorAll('.mouseTool')]).forEach((t, i) => {
    let iconKey = [
        "select",
        "tap",
        "hold",
        "hold_step_normal",
        "flick_default",
        "critical",
        "trace",
        "guide_green_out",
        "damage",
        "bpm",
        "time_signature",
        "hi_speed"
    ]
    t.innerHTML += '<img />'
    let img = t.querySelector('img')
    img.src = "textures/timeline_" + iconKey[i] + ".png"

    t.onclick = select
    t.dataset.tID = i
})

function select(e) {
    ([...document.querySelectorAll('.mouseTool')]).forEach((t, i) => {
        t.classList.remove('selected')
    })
    e.target.parentNode.classList.add('selected')

    currentTool = e.target.parentNode.dataset.tID
}

canvas.addEventListener("mousedown", () => { mouseDown = true })
canvas.addEventListener("mouseup", () => { mouseDown = false })

// setInterval(() => {
    
// }, dt)

let start, previousTimeStamp = 0

requestAnimationFrame(animationStep)

function animationStep(timeStamp) {
    const dt = timeStamp - previousTimeStamp
    
    let width = editorScalar.offsetWidth
    let height = editorScalar.offsetHeight

    width -= 1
    height -= 29 + 24

    canvas.width = width
    canvas.height = height

    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    draw(width, height, dt)

    requestAnimationFrame(animationStep)
    previousTimeStamp = timeStamp
}

let map = new NoteList()
map.append(new Note(10, 0, 0, 6, { info: 120 }))

let mouseDownFrames = 0

function draw(w, h, dt) {
    let { nX, nY, nFX, nFY } = nextPos(w, h)

    if (mouseDown && mouseDownFrames == 0) {
        onClick(w, h)
        if (cNote == null && currentTool == TOOLS.MOUSE) {
            selectionArea.start = [nFX, nFY]
        }
    }

    if (mouseDown) {
        mouseDownFrames++
        
        if (currentTool == TOOLS.MOUSE) {
            if (cNote !== null) {
                if (selection == null) {
                    selection = map.filter(x => x == cNote)
                }
                let dxL = cNote.lane - cNote.size - nX
                let dxR = 1 - (cNote.lane + cNote.size - nX)
                let dx = nX - cNote.lane + 0.5
                let dy = nY - cNote.beat
                selection.forEach((n, i) => {
                    if (isResizeLeft) {

                        if (n.lane - (n.size + dxL) >= -6 && n.size + dxL >= 0) {
                            n.size += dxL / 2
                            n.lane -= dxL / 2
                        }
                        
                        currentNoteSize = cNote.size * 2
                    } else if (isResizeRight) {
                        if (dxR + n.size + n.lane <= 6 && n.size + dxR >= 0) {
                            n.size += dxR / 2
                            n.lane += dxR / 2
                        }
                        
                        currentNoteSize = cNote.size * 2
                    } else {
                        n.move(n.lane + dx, n.beat + dy)
                    }
                })
            } else {
                selectionArea.end = [nFX, nFY]
            }
            // currentNote.x = nX
            // currentNote.y = nY
        }
    } else {
        mouseDownFrames = 0
        cNote = null

        if (selectionArea.start[0] != null && selectionArea.end[0] != null) {
            let startX = Math.min(selectionArea.start[0], selectionArea.end[0])
            let endX = Math.max(selectionArea.start[0], selectionArea.end[0])

            let startY = Math.min(selectionArea.start[1], selectionArea.end[1])
            let endY = Math.max(selectionArea.start[1], selectionArea.end[1])

            selection = map.filter(n => {
                return (startX <= n.lane + n.size)
                    && (endX >= n.lane - n.size)
                    && (startY <= n.beat)
                    && (endY >= n.beat)
            })
        }

        selectionArea.start = [null, null]
        selectionArea.end = [null, null]
    }
    
    //console.log(map[currentNote])

    drawGrid(w, h)
    drawPlayHead(w, h)
    map.draw(offsetY, w, h)
    if (selection != null) {
        selection.drawOutlines(offsetY, w, h)
    }

    if (selectionArea.start[0] != null && selectionArea.end[0] != null) {
        let i = (h / 12) * yScale

        ctx.fillStyle = '#88888833'
        ctx.strokeStyle = '#ffffff'

        ctx.fillRect(
            selectionArea.start[0] * xScale + w / 2,
            h - selectionArea.start[1] * i + offsetY,
            (selectionArea.end[0] - selectionArea.start[0]) * xScale,
            (selectionArea.start[1] - selectionArea.end[1]) * i,
        )

        ctx.strokeRect(
            selectionArea.start[0] * xScale + w / 2,
            h - selectionArea.start[1] * i + offsetY,
            (selectionArea.end[0] - selectionArea.start[0]) * xScale,
            (selectionArea.start[1] - selectionArea.end[1]) * i,
        )
    }

    drawGhostNote(w, h, nX, nY)

    let nextOff = 7.21 * currentBPM / (60 * dt * 100)

    let bpms = map.getAllOfType(nTYPES.BPM)
        .filter(x => x.beat / 4 <= playOff)
        .sort((a, b) => b.beat - a.beat)
    
    let bpm = bpms[0]?.data.info || currentBPM
    
    prevBPM = currentBPM
    currentBPM = bpm

    // console.log(prevBPM, currentBPM)

    if (playing) {
        if (prevBPM != currentBPM) {
            // console.log('j', bpms)
            let x = bpms[0]
            let pos = x.beat / 4
            nextOff = 0
            playOff = pos
        }

        playOff += nextOff
        offsetY = (playOff * (4 / 3)) * h - 300
    }
}

function nextPos(w, h) {
    let nFX = (mouseX - w / 2) / xScale
    let bh = (h / 3 * yScale) / 4
    let nFY = (h - mouseY + offsetY) / (bh)
    // nFY += 2

    let nX = Math.floor(nFX)
    let nY = Math.floor((nFY + 0.0625) * (divisions / 4)) / (divisions / 4)

    return {
        nX,
        nY,
        nFX,
        nFY
    }
}

function onClick(w, h) {
    let { nX, nY, nFX, nFY } = nextPos(w, h)
    cNote = null
    lNote = null

    let onRow = []
    for (let i = -6; i < 6; i += 0.5) {
        onRow[(i + 6) * 2] = map.fromPos(i, nY)
    }

    
    onRow = onRow.filter(x => x != null)
    onRow = onRow.filter(n => nFX >= n.lane - n.size && nFX <= n.lane + n.size)

    cNote = onRow[0] || null

    if (selection != null) {
        if (!selection.includes(cNote)) {
            selection = map.filter(x => x == cNote)
        }
    }

    isResizeLeft = false
    isResizeRight = false

    playOff = nY / 4

    lNote = cNote

    let edgeOff = 0.25

    if (currentTool == 0) {

        if (cNote != null) {
            if (Math.abs((cNote.lane - cNote.size) - nFX) < edgeOff) {
                isResizeLeft = true
            }

            if (Math.abs(cNote.lane - (nFX - cNote.size)) < edgeOff) {
                isResizeRight = true
            }
        }
    } else if (currentTool >= 1) {
        if (cNote != null) {
            if (selection == null) {
                selection = map.filter(x => x == cNote)
            }

            selection.forEach((n, i) => {
                if (currentTool == TOOLS.FLICK) {
                    n.toggleFlick()
                } else if (currentTool == TOOLS.CRIT) {
                    n.toggleCrit()
                } else if (currentTool == TOOLS.HOLD) {
                    n.toggleEasing()
                } else if (currentTool == TOOLS.TRACE) {
                    n.toggleTrace()
                } else if (currentTool == TOOLS.STEP && n.type == nTYPES.STEP) {
                    n.toggleStep()
                }
            })

            if (currentTool >= 8 && currentTool <= 11) {
                // console.log(1)
            }

            if (currentTool == TOOLS.BPM && cNote.type == nTYPES.BPM) {
                cNote.toggleInfo(true)
            } else if (currentTool == TOOLS.HISPEED && cNote.type == nTYPES.HSP) {
                cNote.toggleInfo(true)
            } else if (currentTool == TOOLS.TSIG && cNote.type == nTYPES.TSG) {
                cNote.toggleInfo(true)
            }

        } else {
            if ((nX - Math.floor(currentNoteSize / 2) >= -6 && (nX - Math.floor(currentNoteSize / 2) + currentNoteSize) <= 6) || currentTool > 8) {
                if (currentTool == TOOLS.STEP) {
                    let options = []
                    map.filter(n => n.type == nTYPES.HOLD || n.type == nTYPES.STEP).filter(n => n.data.child != null).forEach((n, i) => {
                        // console.log(n.lane, n.beat, n.data.easeType, n.data.child.lane, n.data.child.beat)
                        let alphaP = (n.beat - nY) / (n.beat - n.data.child.beat)
                        let alpha = ([x => x, eO, eI])[n.data.easeType](alphaP)
                        let nLane = lerp(n.lane, n.data.child.lane, alpha)
                        let nSize = lerp(n.size, n.data.child.size, alpha)
                        if (nFX >= nLane - nSize && nFX <= nLane + nSize && nFY <= n.data.child.beat && nFY >= n.beat) {
                            options.push(n)
                        }
                    })

                    if (options.length < 1) return

                    let n = options.sort((b, a) => a.beat - b.beat)[0]
                    let nN = new Note(7, nX, nY, currentNoteSize / 2, {})
                    nN.data.child = n.data.child
                    nN.data.parent = n
                    nN.data.child.data.parent = nN
                    n.data.child = nN

                    map.append(nN)

                    return
                }
                let types = [
                    null,
                    2,
                    1,
                    7,
                    3,
                    0,
                    4,
                    null,
                    null,
                    10,
                    11,
                    12
                ]
                let type = types[currentTool]

                let note = new Note(type, nX + (0.5 * (currentNoteSize % 2 == 1)), nY, currentNoteSize / 2, {})

                if (note.type == nTYPES.HOLD) {
                    let note2 = new Note(type, nX + (0.5 * (currentNoteSize % 2 == 1)), nY + .125, currentNoteSize / 2, { holdPos: 1 })
                    map.append(note2)

                    note.data.child = note2
                    note2.data.parent = note
                }

                map.append(note)
            }
        }
    }
}

function drawGhostNote(w, h, nX, nY) {

    if (currentTool < 1 || currentTool > 8) return

    let types = [
        null,
        2,
        1,
        7,
        3,
        0,
        4,
        null,
        null,
        10,
        11,
        12
    ]
    let type = types[currentTool]

    let n = new Note(type, nX + (0.5 * (currentNoteSize % 2 == 1)), nY, currentNoteSize / 2, {})

    ctx.globalAlpha = 0.5
    n.draw(offsetY, w, h)
    ctx.globalAlpha = 1
}

function drawPlayHead(w, h) {
    let xspacing = xScale
    let measureH = h / 3
    measureH *= yScale
    
    let y = -(measureH) * (playOff - 0.75)

    y += offsetY

    ctx.strokeStyle = '#ff0000'

    ctx.beginPath()
    ctx.moveTo(-6 * xspacing + w / 2, y)
    ctx.lineTo(6 * xspacing + w / 2, y)
    ctx.stroke()
}

function drawGrid(w, h) {
    let xspacing = xScale
    let measureH = h / 3
    measureH *= yScale

    let numMeasures = Math.floor(h / measureH)

    ctx.fillStyle = '#2228'
    ctx.fillRect(-6 * xspacing + w / 2, 0, xspacing * 12, h)

    for (let i = -6; i < 7; i++) {
        if (i % 2 == 0) {
            ctx.strokeStyle = '#fff'
        } else {
            ctx.strokeStyle = '#7779'
        }
        let x = i * xspacing + w / 2
        ctx.beginPath()
        ctx.moveTo(x, h)
        ctx.lineTo(x, 0)
        ctx.stroke()
    }

    for (let i = 0; i < (numMeasures + 1) * divisions; i++) {
        if (i % (divisions / 4) == 0) {
            ctx.strokeStyle = '#fff'
        } else {
            ctx.strokeStyle = '#7779'
        }

        let h = measureH / divisions
        let y = i * h

        y += offsetY
        
        y = y % (measureH * 4 / yScale)

        ctx.beginPath()
        ctx.moveTo(-6 * xspacing + w / 2, y)
        ctx.lineTo(6 * xspacing + w / 2, y)
        ctx.stroke()
    }
}

function changeYScl(elem) {
    yScale = parseInt(elem.value)
    document.getElementById("yScaleV").innerText = `(${elem.value}x)`
}

function changeDivs(elem) {
    divisions = parseInt(elem.value)
}

function changeSize(elem) {
    currentNoteSize = parseInt(elem.value)
    document.getElementById("sizeV").innerText = `(${elem.value})`
}

//document.addEventListener('keypress', e => e.preventDefault())
document.addEventListener('keydown', e => {
    if (document.activeElement.tagName != 'INPUT') {
        if (e.key == ' ') {
            e.preventDefault()
            playPause()
        } else if (e.key == 'Enter') {
            e.preventDefault()
            playOff = 0
        } else if (e.ctrlKey && e.key == 's') {
            e.preventDefault()
            saveMMW()

            if (e.altKey) {
                saveUSC()
            }
        } else if (e.ctrlKey && e.key == 'l') {
            e.preventDefault()
            
            loadUSC()
        } else if (e.key == 'Delete' || e.key == 'Backspace') {
            if (lNote != null) {
                map.remove(map.indexOf(lNote))
                lNote = null
            }
            if (selection != null) {
                selection.forEach(n => {
                    map.remove(map.indexOf(n))
                })
            }
            selection = null
        } else if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
            currentTool = parseInt(e.key) - 1;
            if (currentTool == -1) {
                currentTool = TOOLS.BPM
            }
            ([...document.querySelectorAll('.mouseTool')]).forEach((c, i) => {
                if (i == currentTool) {
                    c.classList.add('selected')
                } else {
                    c.classList.remove('selected')
                }
            })
        }
    } else {
        updateMetadata()
    }
})

const downloadButton = document.getElementById("download")

function saveSUS() {
    let name = map.metaData.title

    let data = map.getSUS()
    let sus = map.getSUSHeader() + data

    let b = new Blob([sus], {
        type: 'text/plain'
    })

    let u = URL.createObjectURL(b)
    console.log(u)
    
    downloadButton.setAttribute("download", (name || 'untitled') + ".sus")

    downloadButton.href = u
    downloadButton.click()
}

function saveUSC() {
    let name = map.metaData.title

    let data = JSON.stringify(map.getUSC())

    let b = new Blob([data], {
        type: 'application/json'
    })

    let u = URL.createObjectURL(b)
    console.log(u)
    
    downloadButton.setAttribute("download", (name || 'test') + ".usc")

    downloadButton.href = u
    downloadButton.click()
}

function loadUSC() {
    let i = document.createElement('input')
    i.type = 'file'
    i.click()

    i.onchange = e => {
        let t = e.target
        let data
        let f = t.files[0]
        let reader = new FileReader()
        reader.onload = function (r) {
            data = r.target.result

            // console.log(data)

            map.loadUSC(JSON.parse(data))

            // map.setParentChild()
        }
        reader.readAsBinaryString(f)
    }
}

function saveMMW() {
    let name = map.metaData.title

    let data = JSON.stringify(map.mmw())

    let b = new Blob([data], {
        type: 'application/json'
    })

    let u = URL.createObjectURL(b)
    console.log(u)
    
    downloadButton.setAttribute("download", (name || 'untitled') + ".mmw")

    downloadButton.href = u
    downloadButton.click()

    // map.setParentChild()
}

function loadMMW() {
    let i = document.createElement('input')
    i.type = 'file'
    i.click()

    i.onchange = e => {
        let t = e.target
        let data
        let f = t.files[0]
        let reader = new FileReader()
        reader.onload = function (r) {
            data = r.target.result

            // console.log(data)

            map.load(JSON.parse(data))

            // map.setParentChild()
        }
        reader.readAsBinaryString(f)
    }
}

// function saveToLocal(name) {
//     if (name == null && currentName == null) return

//     window.localStorage.setItem("MMW_" + name, map.getSUS())
//     currentName = name
// }

// function loadFromLocal(name) {
//     if (name == null) return

//     if (!name.startsWith("MMW_")) name = "MMW_" + name
//     let sus = window.localStorage.getItem(name)
//     map.load(sus)

//     currentName = name
// }

function playPause() {
    playing = !playing
    // currentBPM = metaData.baseBPM
    if (playing) {
        // Play
        //audioElem.currentTime = 0

        let startTime = 0

        let bs = [...map.getAllOfType(nTYPES.BPM), new Note(10, 0, playOff, 12, { info: currentBPM })]
            .filter(x => {
                // console.log(x.measure + (x.y % x.divs) / x.divs)
                // console.log(x.y)

                // console.log(Math.max(Math.floor(x.measure / 2) - 1, 0) + x.y / x.divs, playOff)
                return x.beat <= playOff
            })
            .sort((b, a) => b.beat - a.beat)

        bs.forEach((n, i) => {
            if (i == bs.length - 1) return

            let l0 = n.beat
            let l1 = bs[i + 1].beat

            let l = l1 - l0

            // console.log(l, 60 * (l * 4) / n.data.info)

            startTime += 60 * (l * 4) / n.data.info

            //console.log(n.y, n.data.info)
        })

        // console.log(startTime)

        audioElem.currentTime = startTime

        audioElem.play()
        
    } else {
        // Pause
        audioElem.pause()
    }
}

function updateMetadata() {
    ([...document.querySelectorAll('input')]).forEach(i => {
        if (i.type == 'file' && i.files.length > 0) {
            let f = i.files[0]
            let reader = new FileReader()
            reader.onload = function (r) {
                var bst = r.target.result
                metaData[i.id] = btoa(bst)
                console.log(f.type)
                if (f.type == 'audio/wav' || f.type == 'audio/mpeg') {
                    let u = URL.createObjectURL(f)
                    audioElem.src = u
                }
            }
            reader.readAsBinaryString(f)
        } else {
            metaData[i.id] = i.value
        }

        map.metaData = metaData
    })
}

document.getElementById('uscSave').onclick = e => {
    saveUSC()
}

document.getElementById('uscLoad').onclick = e => {
    loadUSC()
}

document.getElementById('help').onclick = e => {
    window.location.href = 'help'
}

([...document.querySelectorAll('input')]).forEach(x => {
    x.onchange = updateMetadata
})