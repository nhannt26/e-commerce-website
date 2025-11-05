const bcrypt = require('bcryptjs');

// Hash a password
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10); // Generate salt
    return await bcrypt.hash(password, salt);
};

// Compare password with hash
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Demo function
async function demo() {
    const plainPassword = 'mySecurePassword123';
    
    console.log('\n📝 Original password:', plainPassword);
    
    // Hash password
    const hashed = await hashPassword(plainPassword);
    console.log('🔒 Hashed password:', hashed);
    console.log('📏 Hash length:', hashed.length, 'characters');
    
    // Hash same password again - different result!
    const hashed2 = await hashPassword(plainPassword);
    console.log('🔒 Second hash:', hashed2);
    console.log('❓ Hashes match?', hashed === hashed2); // false!
    
    // Verify correct password
    const isMatch = await comparePassword(plainPassword, hashed);
    console.log('\n✅ Correct password:', isMatch); // true
    
    // Verify wrong password
    const isWrong = await comparePassword('wrongPassword', hashed);
    console.log('❌ Wrong password:', isWrong); // false
}

module.exports = { hashPassword, comparePassword };

// Run demo if file executed directly
if (require.main === module) {
    demo().catch(console.error);
}