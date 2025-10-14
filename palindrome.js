/**
 * Является ли строка палиндромом
 * @param  {string}  value
 * @return {boolean}
 */
function isPalindrome(value) {
    const cleanStr = value.toLowerCase().replace(/\s/g, '');
    const length = cleanStr.length;
    
    for (let i = 0; i < Math.floor(length / 2); i++) {
        if (cleanStr[i] !== cleanStr[length - 1 - i]) {
            return false;
        }
    }
    return true;
}

console.log(isPalindrome('abcd')); 
console.log(isPalindrome('A man a plan a canal Panama'));
