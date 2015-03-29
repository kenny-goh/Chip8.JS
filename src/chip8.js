/**
 * Created by Kenny on 3/25/2015.
 */

/**************************************************************************************************
 * App logic
 **************************************************************************************************/




//
//$( "#programInput" ).change(function() {
//    console.log("Program file is chosen");
//    var file = this.files[0];
//    console.log(file);
//    var reader = new FileReader();
//    reader.onload = function(e) {
//        showHexResult(reader);
//        showBinaryResult(reader);
//    };
//    reader.readAsBinaryString(file);
//});
//
//function showHexResult(fr) {
//    var markup, result, n, aByte, byteStr;
//
//    markup = [];
//    result = fr.result;
//    for (n = 0; n < result.length; ++n) {
//        aByte = result.charCodeAt(n);
//        byteStr = aByte.toString(16);
//        if (byteStr.length < 2) {
//            byteStr = "0" + byteStr;
//        }
//        markup.push(byteStr);
//    }
//    bodyAppend("p", "Hex (" + result.length + "):");
//    bodyAppend("pre", markup.join(" "));
//}
//
//function showBinaryResult(fr) {
//    var markup, result, n, aByte, byteStr;
//
//    markup = [];
//    result = fr.result;
//    for (n = 0; n < result.length; ++n) {
//        aByte = result.charCodeAt(n);
//        byteStr = aByte.toString(2);
//        if (byteStr.length < 2) {
//            byteStr = "0" + byteStr;
//        }
//        markup.push(byteStr);
//    }
//    bodyAppend("p", "Binary (" + result.length + "):");
//    bodyAppend("pre", markup.join(" "));
//}
//
//function bodyAppend(tagName, innerHTML) {
//    var elm;
//
//    elm = document.createElement(tagName);
//    elm.innerHTML = innerHTML;
//    document.body.appendChild(elm);
//}

/**************************************************************************************************
 * Helper
 **************************************************************************************************/

function numberMagnitude(number, magnitude){
    return Math.floor(number / magnitude);
}

function sleep(milliseconds) {
    /*
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
    */
}

function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

String.prototype.padZero= function(len, c){
    var s= this, c= c || '0';
    while(s.length< len) s= c+ s;
    return s;
}

function fileExists(url) {
    if(url){
        var req = new XMLHttpRequest();
        req.open('GET', url, false);
        req.send();
        return req.status==200;
    } else {
        return false;
    }
}

// PERFOMANCE TUNING
BINARY_STRINGS = new Object();
for ( var i = 0; i < 256; i++) {
    BINARY_STRINGS[i] = i.toString(2).padZero(8);
}


/**************************************************************************************************
 *
 **************************************************************************************************/


/**
 * Exception for Chip 8 Virtual Machine
 * @param message
 * @constructor
 */
function Chip8VMError(message) {
    this.message = message;
    this.name = "Chip8VMError";
}

/**
 * Chip8VM is a simple javascript implementation of the Chip 8 virtual machine.
 * For more information about Chip 8, please go to http://en.wikipedia.org/wiki/CHIP-8.
 *
 * Constructor for the virtual Chip8VM
 */
var Chip8VM = function() {
    this.display = new Display();
    this._initialize(true);
};

// Constants
Chip8VM.MEMORY_OFFSET_PROGRAM = 512;
Chip8VM.MEMORY_OFFSET_DATA = 1536;
Chip8VM.MAX_MEMORY = 4095;
Chip8VM.MAX_VREG = 16;
Chip8VM.MAX_STACK = 16;
Chip8VM.DELAY = 1;
Chip8VM.HERTZ = 1;

/**
 * Initializer method
 * @private
 */
Chip8VM.prototype._initialize = function(clearMemory) {

    this.running = false;
    this.programLoaded = false;
    this.vRegs = [];
    this.stack = []
    this.iReg = 0;
    this.stackPtr = 0;
    this.counter = 0;
    this.errors = [];
    this._key_pressed = -1;
    this.delayTimerRegister = 0;
    this.delay = parseInt($("#delayTextEditor").val());
    this.display.color =  $("#colorTextEditor").val();
    this.debugger = $("#debuggerCheckBox").is(":checked");

    this.timeStarted = 0;
    this.timeStopped = 0;
    this.instructionsExecuted = 0;

    // Init _memory
    if (clearMemory) {
        this._memory = [];
        this._memory.length = 0;
        for (var i = 0; i < Chip8VM.MAX_MEMORY; i++) {
            this._memory.push(0); // 0 bytes
        }
    }
    // Init V registers
    this.vRegs.length = 0;
    for (var i = 0; i < Chip8VM.MAX_VREG; i++) {
        this.vRegs.push(0); // 0 bytes
    }
    // Init the rest of the registers

    // Init stack
    this.stack.length = 0;
    for (var i = 0; i < Chip8VM.MAX_STACK; i++) {
        this.stack.push(0); // 0 bytes
    }

    this._init_interpretor_memory();

    this.display.flush();
};

/**
 * Helper function to fill in memory with hex values.
 *
 * @param arr
 * @param pos
 * @returns {*}
 * @private
 */
Chip8VM.prototype._fillHexValues = function(arr,pos) {
    var index = pos;
    var memory = this._memory;
    arr.forEach(function(each) {
        memory[index] = parseInt(each, 16);
        index=index+1;
    });
    return index;
};

/**
 *
 * @param index
 * @param value
 */
Chip8VM.prototype.setProgramMemory = function(index,value) {
    //this._memory[index + Chip8VM.MEMORY_OFFSET_PROGRAM] = value;
    this.setMemory(index,value);
};

/**
 *
 * @param index
 * @returns {*}
 */
Chip8VM.prototype.getProgramMemory = function(index) {
    return this._memory[index + Chip8VM.MEMORY_OFFSET_PROGRAM];;
};


/**
 *
 * @param index
 * @param value
 */
Chip8VM.prototype.setDataMemory = function(index,value) {
    this._memory[index + Chip8VM.MEMORY_OFFSET_DATA] = value;
};

/**
 *
 * @param index
 * @returns {*}
 */
Chip8VM.prototype.getDataMemory = function(index) {
    return this._memory[index + Chip8VM.MEMORY_OFFSET_DATA];

};

/**
 *
 * @param index
 * @param value
 */
Chip8VM.prototype.setMemory = function(index,value) {
    this._memory[index] = value;
};

/**
 *
 * @param index
 * @returns {*}
 */
Chip8VM.prototype.getMemory = function(index) {
    return this._memory[index];
};

/**
 * @private
 */
Chip8VM.prototype._init_interpretor_memory = function() {
    assert(this._memory.length = Chip8VM.MAX_MEMORY);

    var offset = 0;
    // Display representation
    offset = this._fillHexValues(["F0","90","90","90","F0"], offset);
    offset = this._fillHexValues(["20","60","20","20","70"], offset);
    offset = this._fillHexValues(["F0","10","F0","80","F0"], offset);
    offset = this._fillHexValues(["F0","10","F0","10","F0"], offset);
    offset = this._fillHexValues(["90","90","F0","10","10"], offset);
    offset = this._fillHexValues(["F0","80","F0","10","F0"], offset);
    offset = this._fillHexValues(["F0","80","F0","90","F0"], offset);
    offset = this._fillHexValues(["F0","10","20","40","40"], offset);
    offset = this._fillHexValues(["F0","90","F0","90","F0"], offset);
    offset = this._fillHexValues(["F0","90","F0","10","F0"], offset);
    offset = this._fillHexValues(["F0","90","F0","90","90"], offset);
    offset = this._fillHexValues(["E0","90","E0","90","E0"], offset);
    offset = this._fillHexValues(["F0","80","80","80","F0"], offset);
    offset = this._fillHexValues(["E0","90","90","90","E0"], offset);
    offset = this._fillHexValues(["F0","80","F0","80","F0"], offset);
    this._fillHexValues(["F0","80","F0","80","80"], offset);
};

/**
 *
 * @param hexCode
 */
Chip8VM.prototype.evalHexCode = function(hexCode) {
    this.loadFromHexString(hexCode);
    this.start();
}

/**
 *
 * @returns {string}
 * @private
 */
Chip8VM.prototype._dump_memory = function() {
    var str = "";
    assert( this._memory.length == Chip8VM.MAX_MEMORY );
    //console.log(this._memory);
    for (var i = 0; i < 4095; i++) {
        var byte = this._memory[i];
        var binaryStr = byte.toString(2).padZero(8);
        var hexStr = byte.toString(16).padZero(2);
        str = str + i.toString().padZero(4) + ':' + binaryStr + ',' + hexStr + "\n";
    }
    return str;
}

/**
 *
 * @returns {string}
 * @private
 */
Chip8VM.prototype._dump_vregisters = function() {
    var str = "";
    for (var i = 0; i < 15; i++) {
        str = str + i.toString().padZero(2) + ':' + this.vRegs[i] + "\n";
    }
    return str;
}


/**
 *
 * @returns {string}
 * @private
 */
Chip8VM.prototype._dump_stacks = function() {
    var str = "";
    for (var i = 0; i < 15; i++) {
        str = str  + i.toString().padZero(2) + ':' + this.stack[i] + "\n";
    }
    return str;
}


/**
 * The main loop of the Chip 8 Virtual Machine
 * @private
 */
Chip8VM.prototype._mainLoop = function() {

    //console.log("**********************************************************************")
    //console.log('COUNTER:', this.counter);
    //console.log('DELAY TIMER:', this.delayTimerRegister / 60);

    var hiByte = this.getProgramMemory(this.counter);
    var loByte = this.getProgramMemory(this.counter+1);

    //console.log(hiByte,loByte,this.counter);

    if ( this.counter >= Chip8VM.MEMORY_OFFSET_DATA) {
        throw new Chip8VMError("Counter reached end of program");
    }

    //this.display.flush();

    this.counter += 2;
   //console.log("Increment counter to", this.counter)

    //var opCode = hiByte + loByte; // CODE REVIEW: THIS IS WRONG!
    var opCode = (hiByte << 8) | loByte;
    var opCodeLE = hiByte >> 4;
    var opCodeBE = loByte & 0x0F

    //console.log('HI BYTE:', hiByte.toString(16));
    //console.log('LO BYTE:', loByte.toString(16));
    //console.log('OPCODE:', opCode.toString(16));

    // Refer to http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#5xy0
    // for complete specification of the opcodes

    if ( opCode == 0x00E0) {
        // 00E0 CLS opcode
        // Clear the display.
        this.display.flush();
        //console.log("FLUSH!");
    }
    else if (opCode == 0x00EE) {
        // 00EE RET opcode
        // Return from a subroutine.
        this.counter = this.stack[this.stackPtr-1];
        this.stack[this.stackPtr] = 0;
        this.stackPtr -= 1;

    }
    else if ( opCodeLE == 0x1 ) {
        // 1nnn JP addr opcode
        // Jump to location nnn.
        //console.log("Jump address ", opCode & 0x0FFF );
        var nnn =  ( opCode & 0x0FFF ) - Chip8VM.MEMORY_OFFSET_PROGRAM  ;
        if ( this.counter == nnn + 2) {
            //console.log("Pogram has finished execution.");
            this.stop();
        }
        else {
            //console.log(this.counter, nnn)
            this.counter = nnn;
        }
    }
    else if (opCodeLE == 0x2) {
        // 2nnn CALL addr
        // Call subroutine at nnn.
        //console.log("Call subroutine ", opCode & 0x0FFF );
        var nnn =  ( opCode & 0x0FFF ) - Chip8VM.MEMORY_OFFSET_PROGRAM;
        this.stackPtr += 1;
        this.stack[this.stackPtr-1] = this.counter;
        if (this.stackPtr >= Chip8VM.MAX_STACK) {
            var err = "Maximum stack size exceeded";
            this.errors.push(err);
            throw new Chip8VMError(err);
        }
        this.counter = nnn;
    }
    //
    else if ( opCodeLE == 0x3 ) {
        // 3xkk - SE Vx, byte
        // Skip next instruction if Vx = kk.
        var x = hiByte & 0x0F;
        if ( this.vRegs[x] == loByte ) {
            this.counter += 2;
        }
    }
    else if ( opCodeLE == 0x4 ) {
        // 4xkk - SNE Vx, byte
        // Skip next instruction if Vx != kk.
        var x = hiByte & 0x0F;
        if ( this.vRegs[x] != loByte ) {
            this.counter += 2;
        }
    }
    else if ( opCodeLE == 0x5 ) {
        // 5xy0 - SE Vx, Vy
        // Skip next instruction if Vx = Vy.
        var x = hiByte & 0x0F;
        var y = loByte >> 4;
        if ( this.vRegs[x] == this.vRegs[y] ) {
            this.counter += 2;
        }
    }
    else if ( opCodeLE == 0x6 ) {
        // 6xkk - LD Vx, byte
        // Set Vx = kk.
        var x = hiByte & 0x0F;
        this.vRegs[x] = loByte;
   }
    else if ( opCodeLE == 0x7 ) {
        // 7xkk - ADD Vx, byte
        // Set Vx = Vx + kk.
        var x = hiByte & 0x0F;
        this.vRegs[x] = this.vRegs[x] + loByte;
    }
    else if ( opCodeLE == 0x8 &&
              opCodeBE == 0x0 ) {
        // 8xy0 - LD Vx, Vy
        // Set Vx = Vy.
        var x = hiByte & 0x0F;
        var y = loByte >> 4;
        this.vRegs[x] = this.vRegs[y];
    }
    else if ( opCodeLE == 0x8 &&
              opCodeBE == 0x1 ) {
        // 8xy1 - OR Vx, Vy
        // Set Vx = Vx OR Vy.
        var x = hiByte & 0x0F;
        var y = loByte >> 4;
        var vX = this.vRegs[x];
        var vY = this.vRegs[y];
        vX = vX | vY;
        this.vRegs[x] = vX;
    }
    else if (  opCodeLE == 0x8 &&
        opCodeBE == 0x2 ) {
        // 8xy2 - AND Vx, Vy
        // Set Vx = Vx AND Vy.
        var x = hiByte & 0x0F;
        var y = loByte >> 4;
        var vX = this.vRegs[x];
        var vY = this.vRegs[y];
        vX = vX & vY;
        this.vRegs[x] = vX;
    }
    else if (  opCodeLE == 0x8 &&
        opCodeBE == 0x3 ) {
        // 8xy3 - XOR Vx, Vy
        // Set Vx = Vx XOR Vy.
        var x = hiByte & 0x0F;
        var y = loByte >> 4;
        var vX = this.vRegs[x];
        var vY = this.vRegs[y];
        vX = vX ^ vY;
        this.vRegs[x] = vX;
    }
    else if (  opCodeLE == 0x8 &&
               opCodeBE == 0x4 ) {
        // 8xy4 - ADD Vx, Vy
        // Set Vx = Vx + Vy, set VF = carry.
        var x = hiByte & 0x0F;
        var y = loByte >> 4;
        var vX = this.vRegs[x];
        var vY = this.vRegs[y];
        var vX =  vX + vY;
        if (vX > 0xFF) {
            this.vRegs[15] = 1;
            vX = vX & 0x0FF;
        }
        else {
            this.vRegs[15] = 0;
        }
        this.vRegs[x] = vX;
    }
    else if ( opCodeLE == 0x8 &&
              opCodeBE == 0x5 ) {
        //8xy5 - SUB Vx, Vy
        //Set Vx = Vx - Vy, set VF = NOT borrow.
        var x = hiByte & 0x0F;
        var y = loByte >> 4;
        var vX = this.vRegs[x];
        var vY = this.vRegs[y];
        if (vX > vY) {
            this.vRegs[15] = 1
        }
        else {
            this.vRegs[15] = 0
        }
        vX = Math.abs(vX - vY);
        this.vRegs[x] = vX;
    }
    else if ( opCodeLE == 0x8 &&
              opCodeBE == 0x6 ) {
        // 8xy6 - SHR Vx {, Vy}
        // Set Vx = Vx SHR 1.
        var x = hiByte & 0x0F;
        var vX = this.vRegs[x];

        if (vX & 0x01) {
            this.vRegs[15] = 1
        }
        else {
            this.vRegs[15] = 0
        }
        vX = vX >> 1;
        this.vRegs[x] = vX;
    }
    else if ( opCodeLE == 0x8 &&
              opCodeBE == 0x7  ) {
        //8xy7 - SUBN Vx, Vy
        //Set Vx = Vy - Vx, set VF = NOT borrow.
        var x = hiByte & 0x0F;
        var y = loByte >> 4;
        var vX = this.vRegs[x];
        var vY = this.vRegs[y];

        if ( vY > vX) {
            this.vRegs[15] = 1
        }
        else {
            this.vRegs[15] = 0
        }
        vX = Math.abs(vY - vX);
        this.vRegs[x] = vX;
    }
    else if ( opCodeLE == 0x8 &&
              opCodeBE == 0xE ) {
        // 8xyE - SHL Vx {, Vy}
        // Set Vx = Vx SHL 1.
        var x = hiByte & 0x0F;
        var vX = this.vRegs[x];
        if (vX >> 7) {
            this.vRegs[15] = 1
        }
        else {
            this.vRegs[15] = 0
        }
        vX = (vX << 1) & 0xFF;
        this.vRegs[x] = vX;
    }
    else if ( opCodeLE == 0xA  ) {
        // Annn - LD I, addr
        // Set I = nnn.
        // The value of register I is set to nnn.
        this.iReg = opCode & 0x0FFF;
        //console.log("IREG:", this.iReg);
    }
    else if ( opCodeLE == 0xB ) {
        // Bnnn - JP V0, addr
        // Jump to location nnn + V0.
        // The program counter is set to nnn plus the value of V0.
        this.counter = (opCode & 0x0FFF) + this.vRegs[0];
    }
    else if ( opCodeLE == 0xC ) {
        // Cxkk - RND Vx, byte
        // Set Vx = random byte AND kk.
        var x = hiByte & 0x0F;
        var kk = loByte;
        var randNumber = Math.floor((Math.random() * 255) + 0);
        //console.log("RANDOM:", randNumber);
        this.vRegs[x] = kk & randNumber;
    }
    else if ( opCodeLE == 0xD ) {

        // Dxyn - DRW Vx, Vy, nibble
        // Display n-byte sprite starting at _memory location I at (Vx, Vy), set VF = collision.
        // The interpreter reads n bytes from _memory, starting at the
        // address stored in I. These bytes are then displayed as sprites on
        // screen at coordinates (Vx, Vy). Sprites are XORed onto the existing
        // screen. If this causes any pixels to be erased, VF is set to 1, otherwise
        // it is set to 0. If the sprite is positioned so part of it is outside the
        // coordinates of the display, it wraps around to the opposite side of the
        // screen. See instruction 8xy3 for more information on XOR, and section 2.4,
        // Display, for more information on the Chip-8 screen and sprites.


        var x = hiByte & 0x0F;
        var y = loByte >> 4;
        var vX = this.vRegs[x];
        var vY = this.vRegs[y];
        var n = opCodeBE;

        var address = this.iReg;

        //console.log('ADDRESS:', address);
       // console.log("X",vX,"Y",vY, 'N',n);

        var byte = 0;
        var collide = false;
        for ( var i = 0; i < n; i++) {
            byte = this.getMemory(address+i);
            collide = this.display.writeBytes(vX,vY+i,byte) || collide;
        }

        if ( collide ) {
            this.vRegs[15] = 1;
        }
    }
    else if ( opCodeLE == 0xE &&
              loByte == 0x9E) {
        // Ex9E - SKP Vx
        // Skip next instruction if key with the value of Vx is pressed.
        var x = hiByte & 0x0F;
        if (this._key_pressed == this.vRegs[x]) {
            this.counter = this.counter + 2;
        }
    }
    else if ( opCodeLE == 0xE &&
              loByte == 0xA1) {
        //ExA1 - SKNP Vx
        //Skip next instruction if key with the value of Vx is not pressed.
        var x = hiByte & 0x0F;
        if (this._key_pressed != this.vRegs[x]) {
            this.counter = this.counter + 2;
        }
    }
    else if ( opCodeLE == 0xF &&
              loByte == 0x07) {
        // Fx07 - LD Vx, DT
        // Set Vx = delay timer value.
        // The value of DT is placed into Vx.
        // throw new Chip8VMError("Fx07 Not implemented");
        var x = hiByte & 0x0F;
        this.vRegs[x] = this.delayTimerRegister / Chip8VM.HERTZ;
    }
    else if ( opCodeLE == 0xF &&
              loByte == 0x0A ) {
        // Fx0A - LD Vx, K
        // Wait for a key press, store the value of the key in Vx.
        // All execution stops until a key is pressed, then the value of that key is stored in Vx.
        var x = hiByte & 0x0F;
        if ( this._key_pressed >= 0 ) {
            this.vRegs[x] = this._key_pressed;
            // Reset keys
            this._key_pressed = -1;
        }
        else {
            this.counter -= 2;
        }
    }
    else if ( opCodeLE == 0xF &&
              loByte == 0x15) {
        // Fx15 - LD DT, Vx
        // Set delay timer = Vx.
        // DT is set equal to the value of Vx.
        var x = hiByte & 0x0F;
        this.delayTimerRegister = this.vRegs[x] * Chip8VM.HERTZ;
    }
    else if ( opCodeLE == 0xF &&
              loByte == 0x18) {
        // Fx18 - LD ST, Vx
        // Set sound timer = Vx.
        // ST is set equal to the value of Vx.
        // throw new Chip8VMError("Fx07 Not implemented");
    }
    else if ( opCodeLE == 0xF &&
              loByte == 0x1E ) {
        // Fx1E - ADD I, Vx
        // Set I = I + Vx.
        // The values of I and Vx are added, and the results are stored in I.
        var x = hiByte & 0x0F;
        this.iReg = this.iReg + this.vRegs[x];
    }
    else if ( opCodeLE == 0xF &&
              loByte == 0x29 ) {
        // Fx29 - LD F, Vx
        // Set I = location of sprite for digit Vx.
        var x = hiByte & 0x0F;
        this.iReg = this.vRegs[x]*5;
    }
    else if ( opCodeLE == 0xF &&
              loByte == 0x33 ) {
        // Fx33 - LD B, Vx
        // Store BCD representation of Vx in memory locations I, I+1, and I+2.
        // The interpreter takes the decimal value of Vx, and places the hundreds
        // digit in _memory at location in I, the tens digit at location I+1, and the ones digit at location I+2.
        var x = hiByte & 0x0F;
        var address = this.iReg;

        vX = this.vRegs[x];

        var hundreds = numberMagnitude(vX, 100);
        var tens = numberMagnitude(vX, 10);
        var digits = numberMagnitude(vX, 1);

        this.setMemory(address, hundreds);
        this.setMemory(address+1, tens);
        this.setMemory(address+2, digits);
    }
    else if ( opCodeLE == 0xF &&
              loByte == 0x55) {
        //Fx55 - LD [I], Vx
        //Store registers V0 through Vx in _memory starting at location I.
        var x = hiByte & 0x0F;
        var address = this.iReg;
        for ( var i = 0; i <= x; i++) {
            this.setMemory(address, this.vRegs[i]);
            address += 1;
        }
    }
    else if ( opCodeLE == 0xF &&
              loByte  == 0x65) {
        // Fx65 - LD Vx, [I]
        // Read registers V0 through Vx from memory starting at location I.
        var x = hiByte & 0x0F;
        var address = this.iReg;
        for ( var i = 0; i <= x; i++) {
            this.vRegs[i] = this.getMemory(address+i);
        }
    }
    else if (opCode == 0x0000 ) {
        this.stop();
    }

    this.display.renderScreen();

    if (  this.debugger ) {
        this.update_debugger();
    }

    if ( this.delayTimerRegister > 0) {
        this.delayTimerRegister = this.delayTimerRegister-1;
    }

    this.instructionsExecuted += 1;


}

Chip8VM.prototype.update_debugger = function() {
    var memTextArea = document.getElementById("memoryTextArea");
    memTextArea.value = this._dump_memory();
    var regTextArea = document.getElementById("registerTextArea");
    regTextArea.value = this._dump_vregisters();
    var stackTextArea = document.getElementById("stackTextArea");
    stackTextArea.value = this._dump_stacks();
    var stackPtrTextArea = document.getElementById("stackPtrTextArea");
    stackPtrTextArea.value = this.stackPtr;
    var counterInput = document.getElementById("counterText");
    counterInput.value = this.counter;
    var statusInput = document.getElementById("statusText");
    statusInput.value = this.running ? "running" : "idle";

}

/**
 * start the emulator
 */
Chip8VM.prototype.start = function() {

    this.timeStarted = new Date().getTime();

    this.running = true;

    var animFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        null ;

    var cpu = this;
    if ( animFrame !== null ) {
        var recursiveAnim = function() {
            if ( cpu.running ) {
                try {
                    cpu._mainLoop();
                    sleep(cpu.delay);
                    animFrame( recursiveAnim );
                }
                catch (e) {
                    console.log("ERROR OCCURED:", e);
                }
            }
        };

        // start the mainloop
        animFrame( recursiveAnim );
    } else {
        var ONE_FRAME_TIME = 1000.0 / 60.0 ;
        setInterval( this._mainLoop, ONE_FRAME_TIME );
    }
};

/**
 * Stop the emulator
 */
Chip8VM.prototype.stop = function() {
    console.log("HALT");
    this.running = false;
    this.timeStopped = new Date().getTime();
    var perf = (this.timeStopped - this.timeStarted) / 1000;
    console.log("TIME:", perf );
    var instructionsPerSec = this.instructionsExecuted / perf;
    console.log("Instructions / sec:", instructionsPerSec );
};

/**
 * Reset the state of the Chip 8 Virtual Machine
 */
Chip8VM.prototype.reset = function() {
    this.display.flush();
    this.display.renderScreen();
    this._initialize(false);
};

/**
 *
 */
Chip8VM.prototype.loadFromFile = function(file) {
    if ( ! fileExists(file)) {
        throw new Chip8VMError("File not found:" + file);
    }

    var file = file;
    var reader = new FileReader();
    reader.onload = function(e) {
        var result, n, byte;
        result = file.result;
        var index = Chip8VM.MEMORY_OFFSET_PROGRAM;

        for (n = 0; n < result.length; ++n) {
            byte = result.charCodeAt(n);
            this._memory[index] = byte;
            index++;
        }

        this.programLoaded = true;
    };
    reader.readAsBinaryString(file);
};

/**
 *
 * @param str
 */
Chip8VM.prototype.loadFromHexString = function( str ) {
    var index = Chip8VM.MEMORY_OFFSET_PROGRAM;
    var hexString = str.split(" ");
    for (var n = 0; n < hexString.length; ++n) {
        var hex = hexString[n];
        this._memory[index] = parseInt(hex,16);
        index+=1;
    }
    this.programLoaded = true;
};

/**************************************************************************************************
 * Chip8VM Controller
 **************************************************************************************************/

/**
 *
 */
var CPUController = new function() {
    // todo
};

/**************************************************************************************************
 * Display
 **************************************************************************************************/


/**
 *
 *
 */
var Display = function() {
    this.frameBuffer = [];
    this.color = Display.SCREEN_COLOR;
    this._initialize();
};

// Constants
Display.SCREEN_WIDTH =  64;
Display.SCREEN_HEIGHT = 32;
Display.SCREEN_COLOR = "#00FF00";

/**
 *
 * @private
 */
Display.prototype._initialize = function() {
    this.frameBuffer = new Array(Display.SCREEN_WIDTH);
    for ( var x = 0; x <= Display.SCREEN_WIDTH; x++) {
        this.frameBuffer[x] = new Array(Display.SCREEN_HEIGHT);
        for ( var y = 0; y <= Display.SCREEN_HEIGHT; y++) {
            this.frameBuffer[x][y] = 0;
        }
    }
};

/**
 *
 */
Display.prototype.flush = function() {
    for ( var x = 0; x <= Display.SCREEN_WIDTH; x++) {
        for ( var y = 0; y <= Display.SCREEN_HEIGHT; y++) {
            this.frameBuffer[x][y] = 0;
        }
    }
};

/**
 *
 * @param x
 * @param y
 */
Display.prototype.writePixel = function(x,y, value) {

    if ( x > Display.SCREEN_WIDTH) return false;
    if ( x < 0) return false;
    if (y > Display.SCREEN_HEIGHT) return false;
    if ( y < 0) return false;

    var collide = false;

    if (this.frameBuffer[x][y] == 1) {
        collide = true;
    }

    this.frameBuffer[x][y] = this.frameBuffer[x][y] ^ value;
    return collide;
};

/**
 *
 * @param x
 * @param y
 */
Display.prototype.writeBytes = function(x,y, bytes) {
    var collide = false;
    var strBytes = BINARY_STRINGS[bytes];
    for ( var i = 0; i < strBytes.length; i++ ) {
        var strByte = strBytes[i];
        collide = this.writePixel(x+i,y, parseInt(strByte)) || collide ;
    }
    return collide;
};


/**
 *
 */
Display.prototype.renderScreen = function() {

    var canvas =  document.getElementById('display');
    var ctx = canvas.getContext('2d');

    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = this.color;

    var ratio_x = canvasWidth / Display.SCREEN_WIDTH;
    var ratio_y = canvasHeight / Display.SCREEN_HEIGHT;

    for ( var x = 0; x <= Display.SCREEN_WIDTH; x++) {
        for (var y = 0; y <= Display.SCREEN_HEIGHT; y++) {
            var pixel = this.frameBuffer[x][y];
            if ( pixel ) {
                ctx.fillRect(x * ratio_x, y * ratio_y, ratio_x, ratio_y);
            }
        }
    }
};

/**************************************************************************************************
 * Sound
 **************************************************************************************************/


var Sound = function() {
    // todo
};


/**************************************************************************************************
 *
 **************************************************************************************************/

