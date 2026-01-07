// Here's a solid DSA question — medium-hard and good for evaluating problem-solving depth:

// **Problem:**
// Given an array of integers `nums` and an integer `k`, return the length of the *longest subarray* whose sum is **exactly** `k`.
// You must do this in **O(n)** time.

// **Example:**
// Input: `nums = [1, -1, 5, -2, 3], k = 3`
// Output: `4`
// (Explanation: Longest subarray is `[1, -1, 5, -2]`)

// If you want, I can also give constraints or ask follow-ups that test edge-case thinking.

// Yeh ek **array-based DSA question** — clear, direct, aur interview-level:

// **Problem:**
// Given an array of integers `nums`, tumhe **smallest subarray length** find karni hai jiska **sum ≥ target** ho.
// Solution **O(n)** me expected hai (sliding window).

// **Example:**
// `nums = [2,3,1,2,4,3]`, `target = 7`
// Output: `2`
// (Explanation: `[4,3]` ka sum 7 hai aur yeh sabse chhoti valid subarray hai.)

// Agar tumhe isko roman English me explain karna hai, bolo.

// const nums = [2, 3, 1, 2, 4, 3];

// const target = 7;

// const arr = [];

// function findLongSubArray(nums, target) {
//   for (let i = 0; i < nums.length; i++) {
//     for (let j = 0; j < nums.length; j++) {
//       if ((nums[i] == nums[j]) == target) {
//         arr.push(nums[i], nums[j]);
//       }
//     }
//   }

//   return arr;
// }

// findLongSubArray(nums, target);

// const nums = [2, 3, 1, 2, 4, 3];

// function minSubArrayLen(nums, target) {
//   let left = 0;
//   let sum = 0;
//   let minLen = -Infinity;

//   for (let right = 0; right < nums.length; right++) {
//     sum += nums[right];

//     while (sum >= target) {
//       minLen = Math.min(minLen, right - left + 1);
//       sum -= nums[left];
//       left++;
//     }
//   }
// }



// Yeh ek **array + hashing** based DSA question — clean aur interview-grade:

// **Problem:**
// Given an integer array `nums`, return **all unique triplets** `[a, b, c]` jinka sum **exactly 0** ho.
// Triplets repeating nahi hone chahiye (same values, same order).

// **Example:**
// Input: `[-1, 0, 1, 2, -1, -4]`
// Output:

// ```
// [
//   [-1, -1, 1],
//   [-1, 0, 1]
// ]
// ```

// Constraints:

// * Time complexity expected: **O(n²)**
// * Sorting allowed
// * Duplicate triplets strictly avoid karne honge






 const nums = [-1,0,1,2,-1,-4]
 const target = 0;

   function uniqueTriple(nums,target) {
    const arr =[];
    // const 
    for(let i=0; i < nums.length; i++){
               

    }
    
 


   }


 console.log(uniqueTriple(nums,target))


 // remening Problem  solution.