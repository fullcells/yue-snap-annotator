declare module 'to-jyutping' {
	const ToJyutping: {
		getJyutpingList(text: string): [string, string | null][];
	};
	export default ToJyutping;
}
