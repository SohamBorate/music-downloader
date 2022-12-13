// forbidden directory and file name char
const forbiddenDirChars = [
    "#", "%", "&", "{",
    "}", "\\", "/", "<",
    ">", "*", "?", "$",
    "!", "\'", "\"", ":",
    "@", "+", "\`", "|",
    "=", "/"
];

const correctedChars = {
    "&": "and"
};

var deleteForbidDirChars = (text) => {
    let correctedString = ""
    for (let char of text) {
        if (!forbiddenDirChars.includes(char)) {
            correctedString += char;
        } else if (correctedChars[char]) {
            correctedString += correctedChars[char];
        }
    }
    return correctedString;
}

module.exports = deleteForbidDirChars;