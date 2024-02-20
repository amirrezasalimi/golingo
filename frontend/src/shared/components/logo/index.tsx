import { LINKS } from '@/shared/constants/links';
import clsx from 'clsx';
import Link from 'next/link';
interface Props {
    className?: string
}
const Logo = ({ className }: Props) => (
    <Link href={LINKS.HOME}>
        <span className={
            clsx(
                "font-black text-xl bg-gradient-to-r from-indigo-500 to-teal-400 text-transparent bg-clip-text",
                className,
            )
        }>
            GoLingo
        </span>
    </Link>
)
export default Logo;