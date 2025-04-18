const radixColors = require("@radix-ui/colors");

module.exports = {
	// Add content array if needed for PurgeCSS/JIT
	// content: [
	//   "./app/**/*.{js,ts,jsx,tsx}",
	//   "./components/**/*.{js,ts,jsx,tsx}",
	// ],
	theme: {
		extend: {
			colors: {
				// Spread all Radix color scales
				...radixColors,
			},
		},
	},
	plugins: [],
};
