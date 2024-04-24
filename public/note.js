let notes1 = {}
fetch('textures/spr/notes1.json')
    .then(res => res.json())
    .then(j => notes1 = j)

let holdDetail = 2

const nTYPES = {
    TAP: 0,
    HOLD: 1,
    TRACE: 2,
    STEP: 3,
    BPM: 4,
    TSG: 5,
    HSP: 6,
    GUIDE: 7
}

let noteHeight = 25

class Note {
    constructor(_type, lane, beat, size, data) {
        if (typeof type == 'object') {
            for (let [key, val] of Object.entries(type)) {
                this[key] = val
            }

            this.setDrawType()
        } else {
            let type = parseInt(_type)
            this.lane = lane
            this.beat = beat
            this.size = size

            this.measure = Math.floor(this.beat / 4)
        
            this.data = {
                notNote: false,
                flick: false,
                flickDir: null,
                critical: false,
                stepType: null,
                easeType: null,
                fadeType: null,
                holdPos: null,
                trace: false,
                info: null,
                channel: null,
                parsed: false,
                hidden: false,
                color: 2
            }

            for (let [key, val] of Object.entries(data)) {
                this.data[key] = val
            }

            /*
            data: {
                bool flick,
                int flickDir, //0=normal,1=left,2=right
                bool critical,
                int stepType, //0=normal,1=hidden,2=ignored
                int easeType, //0=linear,1=easeIn,2=easeOut
                int fadeType, //0=none,1=fadeIn,2=fadeOut
                int holdPos, //0=start,1=end,2=step
                bool trace
            }
            */
        
            if (([0, 2, 3]).includes(type)) {
                this.type = nTYPES.TAP
            } else if (type == 1) {
                this.type = nTYPES.HOLD
                this.data.easeType = 0
            } else if (([4, 5, 6]).includes(type)) {
                this.type = nTYPES.TRACE
                this.data.trace = true
            } else if (type == 7) {
                this.type = nTYPES.STEP
                this.data.holdPos = 2
                this.data.stepType = 0
                this.data.easeType = 0
            } else if (type == 8) {
                this.type = nTYPES.GUIDE
                this.data.holdPos = 2
                this.data.stepType = 0
                this.data.easeType = 0
                this.data.fadeType = 1
            } else if (type == 10) {
                this.type = nTYPES.BPM
                this.data.notNote = true
                if (this.data.info == null) {
                    this.data.info = parseInt(prompt("What is the BPM?", ""))
                }
            } else if (type == 11) {
                this.type = nTYPES.TSG
                this.data.notNote = true
                this.data.info = "4/4"
            } else if (type == 12) {
                this.type = nTYPES.HSP
                this.data.notNote = true
                if (this.data.info == null) {
                    this.data.info = parseFloat(prompt("What is the Hi Speed?", ""))
                }
            }

            if (this.data.notNote) {
                this.lane = 0
                this.size = 6
            }
        
            if (type == 0 || type == 5) {
                this.data.critical = true
            }

            if (type == 3 || type == 6) {
                this.data.flick = true
                this.data.flickDir = 0
            }

            this.drawType = 0
            this.setDrawType()
        }
    }

    getSUS(nextY, nextBPM) {
        let res = "#"
        // mmmcxyzz:(data)
        let m = this.measure.toString()
        if (m.length == 1) m = "00" + m
        if (m.length == 2) m = "0" + m
        // mmm
        res += m

        
        let spType = "1"
        
        let t = "1", hasY = false
        if (this.type == nTYPES.TAP || this.type == nTYPES.TRACE) {
            t = "1"
        } else if (this.type == nTYPES.HOLD || this.type == nTYPES.STEP) {
            t = "3"
            hasY = true
            spType = 1
            console.log(this.data.holdPos)
            if (this.data.holdPos == 0) {
                spType = 1
            } else if (this.data.holdPos == 1) {
                spType = 2
            } else if (this.data.holdPos == 2) {
                spType = 3 + this.data.stepType
            }
        }
        
        if (this.data.notNote) {
            t = 0
            spType = 1
        }

        // c
        res += t

        // x
        if (this.data.notNote) {
            if (this.type == nTYPES.BPM) {
                res += 8
            }
        } else {
            res += (this.x + 2).toString(16)
        }

        // y
        if (hasY) {
            if (this.data.channel) {
                res += this.data.channel.toString(36)
            } else {
                res += nextY.toString(36)
                this.setChannel(nextY)
            }
        }

        // (data)
        let d = ""
        let posInMeasure = (this.y) - (this.divs * this.measure)
        for (let i = 0; i < posInMeasure; i++) {
            d += "00"
        }
        if (this.type == nTYPES.TAP) {
            if (this.data.critical) {
                spType = 2
            }
        } else if (this.type == nTYPES.TRACE) {
            spType = 5
        }
        if (this.type == nTYPES.BPM) {
            d += '0' + nextBPM.toString()
        } else {
            d += spType + this.size.toString(16)
        }
        for (let i = 0; i < this.divs - posInMeasure - 1; i++) {
            d += "00"
        }

        res += ": " + (hasY ? "" : " ") + d

        if (this.data.trace && this.type != nTYPES.TAP) {
            res += "\n#" + m + "1" + (this.x + 2).toString(16)
            res += ":  "
            d = ""
            let posInMeasure = (this.y) - (this.divs * this.measure)
            for (let i = 0; i < posInMeasure; i++) {
                d += "00"
            }
            d += "3" + this.size.toString(16)
            for (let i = 0; i < this.divs - posInMeasure - 1; i++) {
                d += "00"
            }
            res += d
        }

        if (this.data.flick) {
            res += "\n#" + m + "5" + (this.x + 2).toString(16)
            res += ":  "
            d = ""
            let posInMeasure = (this.y) - (this.divs * this.measure)
            for (let i = 0; i < posInMeasure; i++) {
                d += "00"
            }
            let flicksKey = [
                1,
                3,
                4
            ]
            d += flicksKey[this.data.flickDir] + this.size.toString(16)
            for (let i = 0; i < this.divs - posInMeasure - 1; i++) {
                d += "00"
            }
            res += d
        }

        if (this.data.critical && this.type != nTYPES.TAP) {
            res += "\n#" + m + "1" + (this.x + 2).toString(16)
            res += ":  "
            d = ""
            let posInMeasure = (this.y) - (this.divs * this.measure)
            for (let i = 0; i < posInMeasure; i++) {
                d += "00"
            }
            d += "2" + this.size.toString(16)
            for (let i = 0; i < this.divs - posInMeasure - 1; i++) {
                d += "00"
            }
            res += d
        }

        if (this.type == nTYPES.HOLD || this.type == nTYPES.STEP) {
            if (this.data.easeType > 0) {
                let spType = "2"

                if (this.data.easeType == 1) {
                    spType = "5"
                }

                res += "\n#" + m + "5" + (this.x + 2).toString(16)
                res += ":  "
                d = ""
                let posInMeasure = (this.y) - (this.divs * this.measure)
                for (let i = 0; i < posInMeasure; i++) {
                    d += "00"
                }
                d += spType + this.size.toString(16)
                for (let i = 0; i < this.divs - posInMeasure - 1; i++) {
                    d += "00"
                }
                res += d
                }
        }

        if (this.type == nTYPES.BPM) {
            let b = nextBPM.toString()
            let z = b.length < 2 ? '0' : ''
            res = '#BPM' + z + b + ": " + this.data.info + "\n" + res
        }

        if (this.type == nTYPES.HSP) {
            res = ''
        }

        return res
    }

    getUSCobj() {
        let USC = {}

        if (this.data.channel || this.data.parent) {
            let bottom = this,
                top = this,
                end = false
                
            while (!end) {
                if (bottom.data.parent) {
                    bottom = bottom.data.parent
                } else {
                    end = true
                }
            }
            
            end = false

            while (!end) {
                if (top.data.child) {
                    top = top.data.child
                } else {
                    end = true
                }
            }

            end = false
            let r = top

            while (!end) {
                if (r.data.parent) {
                    r = r.data.parent
                    r.data.parsed = true
                } else {
                    end = true
                }
            }

            end = false
            r = bottom

            if (!this.data.parsed) {
                let points = []

                while (!end) {
                    let data = {
                        beat: r.beat,
                        ease: (['linear', 'out', 'in'])[r.data.easeType || 0],
                        lane: r.lane,
                        size: r.size,
                        timeScaleGroup: 0,
                        type: (['start', 'end', 'tick', 'attach'])[r.data.holdPos || 0]
                    }

                    if ((r.data.holdPos || 0) == 0 || r.data.holdPos == 1) {
                        data.judgeType = r.data.trace ? 'trace' : 'normal'
                    }

                    if (r.data.stepType != 2) {
                        data.critical = r.data.critical
                    }

                    points.push(data)

                    if (r.data.child) {
                        r = r.data.child
                    } else {
                        end = true
                    }
                }

                return {
                    connections: points,
                    critical: this.data.critical,
                    type: "slide"
                }
            } else {
                return -1
            }
        } else if (this.data.notNote) {
            if (this.type == nTYPES.BPM) {
                USC.beat = this.beat
                USC.bpm = this.data.info
                USC.type = "bpm"
            }
        } else {
            USC.beat = this.beat
            USC.critical = this.data.critical
            USC.size = this.size
            USC.lane = this.lane
            USC.timeScaleGroup = 1
            USC.trace = this.data.trace
            if (this.data.flick) {
                USC.direction = (['up', 'left', 'right'])[this.data.flickDir]
            }
            USC.type = "single"
        }

        return USC
    }

    toggleInfo(b) {
        let d = prompt(`What is the value? (Used to be ${this.data.info})`, "")
        this.data.info = b ? parseInt(d) : d
    }

    setChannel(c) {
        this.data.channel = c
        if (this.data.parent) {
            if (this.data.parent.data.channel != c) {
                this.data.parent.setChannel(c)
            }
        }
        if (this.data.child) {
            if (this.data.child.data.channel != c) {
                this.data.child.setChannel(c)
            }
        }
    }

    setDrawType() {
        if (this.data.notNote) {
            this.drawType = this.type + 6
        } else if (!this.data.trace) {
            if (this.type == nTYPES.HOLD) {
                this.drawType = 1
            } else {
                this.drawType = 2
            }

            if (this.data.flick) {
                this.drawType = 3
            }
            if (this.data.critical) {
                this.drawType = 0
            }
        } else {
            this.drawType = 4
            if (this.data.flick) {
                this.drawType = 6
            }
            if (this.data.critical) {
                this.drawType = 5
            }
        }

        this.imageSrc = "notes_" + this.drawType + ".png"
        this.image = new Image()
        this.image.src = 'textures/notes1.png'

        this.spriteCut = []

        this.spriteCut = notes1[this.imageSrc]
        
        if (this.data.flick) {
            let diag = "", crtcl = ""
            if (this.data.flickDir != 0) {
                diag = "_diagonal"
            }
            if (this.data.critical) {
                crtcl = "_crtcl"
            }
            this.flickImgSrc = "notes_flick_arrow" + crtcl + "_0" + Math.min(Math.floor(this.size * 2), 5) + diag + ".png"
            this.flickImg = new Image()
            this.flickImg.src = 'textures/notes1.png'

            this.flickSpriteCut = notes1[this.flickImgSrc]
        }

        if (this.type == nTYPES.STEP || this.type == nTYPES.TRACE || this.data?.trace) {
            let type = "long"
            if (this.data.flick) {
                type = "flick"
            }
            if (this.data.critical) {
                type = "crtcl"
            }
            this.stepImgSrc = "notes_friction_among_" + type + ".png"
            this.stepImg = new Image()
            this.stepImg.src = 'textures/notes1.png'

            this.stepSpriteCut = notes1[this.stepImgSrc]
        }
        
        // console.log(this.data)
    }

    toggleFlick() {
        if (this.data.child) {
            return this.data.child.toggleFlick()
        }

        if (this.data.flick) {
            this.data.flickDir++
            
            if (this.data.flickDir == 3) {
                this.data.flick = false
                this.data.flickDir = null
            }
        } else {
            this.data.flick = true
            this.data.flickDir = 0
        }

        this.setDrawType()
    }

    toggleCrit() {
        if (this.data.child && this.data.child.data.critical == this.data.critical) {
            this.data.child.toggleCrit()
        }

        this.data.critical = !this.data.critical

        this.setDrawType()
    }

    toggleTrace() {
        this.data.trace = !this.data.trace
        this.setDrawType()
    }

    toggleEasing() {
        this.data.easeType++
        if (this.data.easeType == 3) this.data.easeType = 0
    }

    toggleColor() {
        this.data.color ++
        if (this.data.color >= 8) this.data.color = 0

        let r = this
        while (r.data.child != null) {
            r.data.child.data.color = this.data.color
            r = r.data.child
        }

        r = this
        while (r.data.parent != null) {
            r.data.parent.data.color = this.data.color
            r = r.data.parent
        }
    }

    toggleStep() {
        this.data.stepType ++
        if (this.data.stepType > 2) this.data.stepType = 0

        if (this.data.stepType == 2) {
            this.data.holdPos = 3
        } else {
            this.data.holdPos = 2
        }

        this.setDrawType()
    }

    appendStep() {
        let n = new Note(7, this.lane, this.beat + 0.125, this.size, {})
        this.data.child.data.parent = n
        n.data.child = this.data.child
        n.data.parent = this
        this.data.child = n

        return n
    }

    move(nX, nY) {
        this.lane = Math.max(Math.min(nX, 6 - this.size), this.size - 6)

        if ((2 * this.size) % 2 == 0 && Math.abs(this.lane) != Math.abs(6 - this.size)) this.lane += 0.5
        this.beat = nY

        this.measure = Math.floor(this.beat / 4)

        if (this.data.notNote) {
            this.lane = 0
            this.size = 6
        }
    }

    drawHold(yOff, w, h) {
        let i = (h / 12) * yScale

        if (this.data.stepType == 2) {
            return
        }

        if (this.data.child) {
            // console.log(this)
            let c = this.data.child

            while (c.data.stepType == 2) {
                c = c.data.child
            }

            let startLane = this.lane
            let endLane = c.lane
            let startBeat = this.beat
            let endBeat = c.beat

            // console.log(startBeat, startLane, endBeat, endLane)

            let sPy = h - (startBeat) * i
            let ePy = h - (endBeat) * i

            let color = 0

            let img = new Image()
            img.src = 'textures/longNoteLine.png'

            if (this.type == nTYPES.GUIDE) {
                img.src = 'textures/guideColors.png'
                color = 1 + 3 * this.data.color
            } else {
                color = this.data.critical ? 9 : 0
            }

            //console.log(sPy, ePy)
            
            for (let j = Math.min(ePy, sPy); j < Math.max(ePy, sPy); j += holdDetail) {
                let alphaP = remap(j, sPy, ePy, 0, 1)
                let alpha = alphaP
                if (this.data.easeType == 0) {
                    alpha = l(alphaP)
                } else if (this.data.easeType == 1) {
                    alpha = eO(alphaP)
                } else if (this.data.easeType == 2) {
                    alpha = eI(alphaP)
                }
                
                let dSize = lerp(this.size, this.data.child.size, alpha) * 2
                let nX = (lerp(startLane, endLane, alpha) - dSize / 2) * xScale + w / 2


                // console.log(dSize)

                if (!(j + yOff < h && j + yOff > 0)) {
                    continue
                }

                if (this.type == nTYPES.GUIDE) {
                    if (this.data.fadeType == 1) {
                        ctx.globalAlpha = 0.75 * remap(alphaP, 0, 1, .25, 1)
                    } else if (this.data.fadeType == 2) {
                        ctx.globalAlpha = 0.75 * remap(1 - alphaP, 0, 1, .25, 1)(1 - alphaP)
                    }
                }
                
                ctx.drawImage(
                    img,
                    32,
                    color,
                    242,
                    1,
                    nX,
                    j + yOff,
                    dSize * xScale,
                    holdDetail
                )
            }
        }
    }

    draw(yOff, w, h) {
        let i = (h / 12) * yScale

        if (!(this.beat * i > yOff && this.beat * i < yOff + h)) {
            return
        }

        if (this.type == nTYPES.GUIDE) {
            return
        }
        
        if (this.data.notNote) {
            let cs = [
                '#55ff55',
                '#ffff55',
                '#ff5555'
            ]
            ctx.fillStyle = cs[this.drawType - 10]
            ctx.fillRect(
                6 * xScale + w / 2,
                h - this.beat * i + yOff,
                xScale * (this.drawType - 9),
                2.5
            )
            ctx.font = '14px sans-serif'
            ctx.fillRect(
                (7 + this.drawType - 10) * xScale + w / 2,
                h - (this.beat) * i + yOff - 12,
                35,
                25
            )
            ctx.fillStyle = '#000'
            ctx.fillText(
                this.data.info,
                (7 + this.drawType - 10) * xScale + w / 2 + 4,
                h - (this.beat) * i + yOff + 6,
            )
            return
        }

        if (this.type != nTYPES.STEP && this.data.hidden == false) {

            // Start Piece
            ctx.drawImage(
                this.image,
                this.spriteCut[0],
                this.spriteCut[1],
                this.spriteCut[2] / 3,
                this.spriteCut[3],
                (this.lane - 0.5 - this.size) * xScale + w / 2 + 2,
                h - (this.beat) * i + yOff - noteHeight / 2,
                noteHeight,
                noteHeight
            )

            // Mid Piece
            ctx.drawImage(
                this.image,
                this.spriteCut[0] + this.spriteCut[2] / 3,
                this.spriteCut[1],
                this.spriteCut[2] / 3,
                this.spriteCut[3],
                (this.lane + 0.5 - this.size) * xScale + w / 2 - noteHeight / 4 + 3,
                h - (this.beat) * i + yOff - noteHeight / 2,
                (this.spriteCut[2] * (this.size * 2 - 1)) / (4 * 3) + noteHeight / 4 + this.size,
                noteHeight
            )

            // End Piece
            ctx.drawImage(
                this.image,
                this.spriteCut[0] + 2 * this.spriteCut[2] / 3,
                this.spriteCut[1],
                this.spriteCut[2] / 3,
                this.spriteCut[3],
                (this.lane - 0.5 + this.size) * xScale + w / 2 + 2,
                h - (this.beat) * i + yOff - noteHeight / 2,
                noteHeight,
                noteHeight
            )

            // Flick
            if (this.data.flick == true) {
                let flip = 1
                if (this.data.flickDir == 2) {
                    flip = -1
                    ctx.translate(w, 0)
                    ctx.scale(-1, 1)
                }
                ctx.drawImage(
                    this.flickImg,
                    this.flickSpriteCut[0],
                    this.flickSpriteCut[1],
                    this.flickSpriteCut[2],
                    this.flickSpriteCut[3],
                    (flip * (this.lane - Math.min(this.size, 3)) * xScale + w / 2 - 1),
                    h - (this.beat + 0.04 * Math.min(this.size, 3)) * i + yOff - noteHeight / 2,
                    flip * ((this.spriteCut[2] * (Math.min(this.size, 3) * 2)) / (4 * 3) + 1),
                    this.flickSpriteCut[3] / 8
                )
                if (this.data.flickDir == 2) {
                    flip = -1
                    ctx.scale(-1, 1)
                    ctx.translate(-w, 0)
                }
            }
        }

        if (this.type == nTYPES.STEP || this.type == nTYPES.GUIDE) {
            ctx.strokeStyle = '#fff'
            ctx.strokeRect(
                (this.lane - this.size) * xScale + w / 2 - 1,
                h - (this.beat) * i + yOff - 15,
                (this.spriteCut[2] * (this.size * 2)) / (4 * 3) + this.size + 1,
                this.spriteCut[3] / 8
            )
        }

        if ((this.type == nTYPES.STEP && this.data.stepType != 1) || this.type == nTYPES.TRACE || this.data?.trace) {
            var lane = this.lane
            if (this.data.stepType == 2) {
                var beginning = this.data.parent
                var end = this.data.child
    
                while (beginning.data.stepType == 2) {
                    beginning = beginning.data.parent
                }
    
                while (end.data.stepType == 2) {
                    end = end.data.child
                }

                var alphaP = (this.beat - beginning.beat) / (end.beat - beginning.beat)
                var alpha
                if (beginning.data.easeType == 0) {
                    alpha = l(alphaP)
                } else if (beginning.data.easeType == 1) {
                    alpha = eO(alphaP)
                } else if (beginning.data.easeType == 2) {
                    alpha = eI(alphaP)
                }

                var lane = lerp(beginning.lane, end.lane, alpha)
            }
            ctx.drawImage(
                this.stepImg,
                this.stepSpriteCut[0],
                this.stepSpriteCut[1],
                this.stepSpriteCut[2],
                this.stepSpriteCut[3],
                (lane - 0.75) * xScale + w / 2 - 1 + noteHeight / 2,
                h - (this.beat) * i + yOff - noteHeight / 2,
                noteHeight,
                noteHeight
            )
        }
    }

    getWeight() {
        return this.beat
    }
}

class NoteList extends Array {
    constructor() {
        super()
    }

    loadUSC(data) {
        this.clear()
        var objs = data.usc.objects
        objs.forEach(obj => {
            if (obj.type == 'single') {
                // console.log(obj)
                var n = new Note(2, obj.lane, obj.beat, obj.size, {})
                n.data.critical = obj.critical
                n.data.trace = obj.trace
                if (obj.direction) {
                    n.data.flick = true
                    var key = {
                        "up": 0,
                        "left": 1,
                        "right": 2
                    }
                    n.data.flickDir = key[obj.direction]
                }
                n.setDrawType()
                this.append(n)
            } else if (obj.type == 'slide') {
                var notes = obj.connections
                var ns = []
                notes.forEach(hit => {
                    // console.log(hit)
                    var n = new Note(1, hit.lane, hit.beat, hit.size, {})
                    if (hit.type == 'start') {
                        n.data.holdPos = 0
                    } else if (hit.type == 'end') {
                        n.data.holdPos = 1
                    } else if (hit.type == 'tick') {
                        n.data.holdPos = 2
                        n.data.stepType = 0
                        n.type = nTYPES.STEP

                        if (!Object.keys(hit).includes('critical')) {
                            n.data.stepType = 1
                        }
                    } else if (hit.type == 'attach') {
                        n.type = nTYPES.STEP
                        n.data.stepType = 2
                        n.data.holdPos = 3
                    } else {
                        // console.log(hit.type)
                    }
                    if (hit.judgeType == 'trace') {
                        n.data.trace = true
                    } else if (hit.judgeType == 'none') {
                        n.data.hidden = true
                    }
                    if (hit.direction) {
                        n.data.flick = true
                        var key = {
                            "up": 0,
                            "left": 1,
                            "right": 2
                        }
                        n.data.flickDir = key[hit.direction]
                    }
                    if (hit.ease == 'linear') {
                        n.data.easeType = 0
                    } else if (hit.ease == 'in') {
                        n.data.easeType = 2
                    } else if (hit.ease == 'out') {
                        n.data.easeType = 1
                    }
                    n.data.critical = obj.critical
                    ns.push(n)
                })
                ns.forEach((n, i) => {
                    if (i != 0) {
                        n.data.parent = ns[i - 1]
                    }
                    if (i != ns.length - 1) {
                        n.data.child = ns[i + 1]
                    }
                    n.setDrawType()
                    // console.log(n.data.easeType)
                    this.push(n)
                })
            } else if (obj.type == 'bpm') {
                // console.log(obj)
                let n = new Note(10, 0, obj.beat, 6, { info: obj.bpm })
                this.push(n)
            } else if (obj.type == 'timeScaleGroup') {
                obj.changes.forEach(x => {
                    var n = new Note(12, 0, x.beat, 6, { info: x.timeScale })
                    this.push(n)
                })
            } else if (obj.type == 'guide') {
                console.log(obj)
                var notes = obj.midpoints
                var ns = []
                notes.forEach(hit => {
                    var n = new Note(8, hit.lane, hit.beat, hit.size, {})
                    if (hit.ease == 'linear') {
                        n.data.easeType = 0
                    } else if (hit.ease == 'in') {
                        n.data.easeType = 2
                    } else if (hit.ease == 'out') {
                        n.data.easeType = 1
                    }
                    let key = {
                        white: 0,
                        red: 1,
                        green: 2,
                        purple: 3,
                        yellow: 4,
                        pink: 5,
                        blue: 6,
                        black: 7
                    }
                    n.data.color = key[obj.color]
                    n.data.fadeType = obj.fade
                    ns.push(n)
                })
                ns.forEach((n, i) => {
                    if (i != 0) {
                        n.data.parent = ns[i - 1]
                    }
                    if (i != ns.length - 1) {
                        n.data.child = ns[i + 1]
                    }
                    n.setDrawType()
                    // console.log(n.data.easeType)
                    this.push(n)
                })
            }
        })
    }

    clear() {
        this.forEach((n, i) => {
            this.splice(this.indexOf(n))
        })
    }

    load(data) {
        data.forEach((n, i) => {
            if ('connections' in n) {
                let hold = []

                n.connections.forEach(i => {
                    let t = 1,
                        data = {
                            critical: n.critical
                        }
                    
                    if (i.type == 'tick') {
                        t = 7
                        data.holdPos = 2
                        data.stepType = 2

                        if ('critical' in i) {
                            data.stepType = 0
                        }
                    } else if (i.type == 'start') {
                        data.holdPos = 0

                        if (t.judgeType == 'trace') {
                            data.trace = true
                        }
                    } else if (i.type == 'end') {
                        data.holdPos = 1
                    }

                    let nN = new Note(t, i.lane, i.beat, i.size, data)
                    hold.push(nN)
                })

                console.log(hold)
                hold.forEach((m, i) => {
                    if (i != 0) {
                        m.data.parent = hold[i - 1]
                    }
                    if (i != hold.length - 1) {
                        m.data.child = hold[i + 1]
                    }
                    this.push(m)
                })
            } else {
                let nN = new Note(n)
                this.push(nN)
            }
        })
    }

    remove(idx) {
        let n = this[idx]

        if (n == undefined) return

        if (n.type == nTYPES.HOLD || n.type == nTYPES.GUIDE) {
            if (n.data.child) {
                let r = n.data.child
                while (r != null) {
                    this.splice(this.indexOf(r))
                    r = r.data.child
                }
            }
            if (n.data.parent) {
                let r = n.data.parent
                while (r != null) {
                    this.splice(this.indexOf(r))
                    r = r.data.parent
                }
            }
        } else if (n.type == nTYPES.STEP) {
            n.data.parent.data.child = n.data.child
            n.data.child.data.parent = n.data.parent
        }

        this.splice(this.indexOf(n), 1)
    }

    append(note) {
        if (this.fromPos(note.x, note.y) == null) {
            this.push(note)
            return note
        } else {
            return -1
        }
    }

    drawOutlines(yOff, w, h) {
        let i = h / 12 * yScale

        let xPadd = 5
        let yPadd = 5

        this.forEach(n => {
            ctx.strokeStyle = '#ffffffbb'
            ctx.lineWidth = 2

            ctx.beginPath()
            ctx.roundRect(
                (n.lane - n.size) * xScale + w / 2 - xPadd,
                h - n.beat * i + yOff - 11 - yPadd,
                (n.size * 2) * xScale + xPadd * 2,
                20 + yPadd * 2,
                5
            )
            ctx.stroke()
        })
    }

    draw(yOff, w, h) {
        this.forEach((n, i) => {
            if (n.data.notNote) {
                n.draw(yOff, w, h)
            }
        })
        ctx.globalAlpha = 0.75
        this.forEach((n, i) => {
            n.drawHold(yOff, w, h)
        })
        ctx.globalAlpha = 1
        this.forEach((n, i) => {
            if (!n.data.notNote) {
                n.draw(yOff, w, h)
            }
        })
    }

    fromPos(lane, beat) {
        let res = this.filter((n, i) => {
            return (n.lane == lane && n.beat == beat)
        })
        if (res.length == 0) {
            return null
        } else {
            return res[0]
        }
    }

    getAllOfType(ntype) {
        return this.filter((x, i) => {
            return (x.type == ntype)
        })
    }

    setChannels() {
        let nextY = 0
        this.forEach((n, i) => {
            if (n.type == nTYPES.HOLD) {
                nextY = (nextY + 1) % 36
                n.setChannel(nextY)
            }
            n.data.parsed = true
        })

        this.forEach(n => n.data.parsed = false)

        this.forEach((n, i) => {
            n.data.parent = null
            n.data.child = null
        })
    }

    mmw() {
        let res = []
        let m = this.filter(x => true)

        m.filter(x => x.type != nTYPES.HOLD && x.type != nTYPES.STEP).forEach(n => {
            res.push(n)
        })
        m.filter(x => x.type == nTYPES.HOLD || x.type == nTYPES.STEP).forEach(n => {
            let bottom = n,
                top = n,
                end = false
                
            while (!end) {
                if (bottom.data.parent) {
                    bottom = bottom.data.parent
                } else {
                    end = true
                }
            }
            
            end = false

            while (!end) {
                if (top.data.child) {
                    top = top.data.child
                } else {
                    end = true
                }
            }

            end = false
            let r = top

            while (!end) {
                if (r.data.parent) {
                    r = r.data.parent
                    r.data.parsed = true
                } else {
                    end = true
                }
            }

            end = false
            r = bottom

            if (!n.data.parsed) {
                let points = []

                while (!end) {
                    let data = {
                        beat: r.beat,
                        ease: (['linear', 'out', 'in'])[r.data.easeType || 0],
                        lane: r.lane,
                        size: r.size,
                        timeScaleGroup: 0,
                        type: (['start', 'end', 'tick', 'attach'])[r.data.holdPos || 0]
                    }

                    if ((r.data.holdPos || 0) == 0 || r.data.holdPos == 1) {
                        data.judgeType = r.data.trace ? 'trace' : 'normal'
                    }

                    if (r.data.stepType != 2) {
                        data.critical = r.data.critical
                    }

                    points.push(data)

                    if (r.data.child) {
                        r = r.data.child
                    } else {
                        end = true
                    }
                }

                res.push({
                    connections: points,
                    critical: n.data.critical,
                    type: "slide"
                })
            }
        })

        m.forEach(n => {
            n.data.child = null
            n.data.parent = null
        })

        return res
    }

    setParentChild() {
        let m = this
        m.forEach((n, i) => {
            if (n.data.channel != null) {
                let others = m.filter(x => x.data.channel == n.data.channel)
                
                function sFc(a, b) {
                    return a.beat - b.beat
                }

                others.sort(sFc)

                others.forEach((n, i) => {
                    if (i != 0) {
                        n.data.child = others[i - 1]
                    }
                    if (i != others.length - 1) {
                        n.data.parent = others[i + 1]
                    }
                })

                others.forEach(n => {
                    let t = n.data.child
                    
                    n.data.child = n.data.parent
                    n.data.parent = t

                    n.data.channel = null
                })

                //console.log(others.map(x => x.y + x.divs * x.measure))
            }
        })
    }

    getSUS() {
        let nextY = 0
        let nextBPM = 0

        let res = ""
        this.sort((a, b) => {
            return a.getWeight() - b.getWeight()
        })

        let hsps = []
        this.filter(x => x.type == nTYPES.HSP).forEach((n, i) => {
            let hRes = ''
            hRes += n.measure + '\''
            hRes += (n.y / n.divs) * (4 * 480) + ':'
            hRes += n.data.info
            hsps.push(hRes)
        })
        let hspStr = '"' + hsps.join(', ') + '"'
        
        if (hsps.length > 0) {
            res += '\n#TIL00: ' + hspStr
            res += '\n#HISPEED 00'
        }

        this.forEach((n, i) => {
            if (n.type == nTYPES.HOLD) {
                console.log(nextY)
                nextY = (nextY + 1)
            }
            if (n.type == nTYPES.BPM) {
                nextBPM ++
            }
            res += n.getSUS(nextY, nextBPM) + "\n"
            n.data.parsed = true
        })

        this.forEach((n, i) => {
            n.data.parsed = false
        })

        return res
    }

    getUSC() {
        let q = this.sort((a, b) => a.getWeight() - b.getWeight())
        let objects = q.filter(x => x.type != nTYPES.HSP).map(x => x.getUSCobj()).filter(x => x != -1)

        let speeds = {
            changes: [],
            type: "timeScaleGroup"
        }

        q.filter(x => x.type == nTYPES.HSP).forEach(n => {
            speeds.changes.push({
                beat: n.beat,
                timeScale: n.data.info
            })
        })

        let bpms = {}

        if (speeds.changes.length > 0) {
            objects.push(speeds)
        }
        // objects.push(bpms)

        let USC = {
            version: 2,
            usc: {
                objects,
                offset: 0
            }
        }

        return USC
    }

    getSUSHeader() {
        return `This file was generated by MikuMikuWev (${VERSION}) for Chart Cyanvas\n#TITLE "${this.metaData.title}"\n#ARTIST "${this.metaData.artist}"\n#DESIGNER "${this.metaData.designer}"\n#WAVEOFFSET ${this.metaData.musicOffset}\n\n#REQUEST "ticks_per_beat 480"\n#REQUEST "side_lane true"\n#REQUEST "lane_offset 0"\n\n#00002: 4\n\n#TIL00 "0\'0:0"\n#MEASUREHS 00\n`
    }
}






function remap(v, l1, h1, l2, h2) {
    return l2 + (h2 - l2) * (v - l1) / (h1 - l1)
}

function lerp(a, b, al) {
    return a * (1 - al) + b * al
}

function l(x) {
    return x
}
function eO(x) {
    return 1 - Math.pow(x - 1, 2)
}
function eI(x) {
    return Math.pow(x, 2)
}