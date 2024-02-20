import { trpc } from "../utils/trpc"

const useWordsCredit = () => {
    const wordsCredits = trpc.getWordsCredit.useQuery();

    return {
        wordsCredits: wordsCredits.data ?? 0,
        refresh: wordsCredits.refetch
    }
}

export default useWordsCredit;