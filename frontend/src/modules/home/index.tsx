"use client";
import Auth from "@/shared/components/auth";
import { trpc } from "@/shared/utils/trpc";

const Home = () => {
    const users = trpc.getUsers.useQuery();

    return (
        <div>
            <h1>Home</h1>
            {/* beautiful users list */}
            <h2>
                Users ({users.status}):
            </h2>
            <ul>
                {users.data?.items.map((user) => (
                    <li key={user.id}>
                        {user.username} -
                        {user.verified && "✅"}
                    </li>
                ))}
            </ul>


            <Auth /> 
        </div>
    )
}

export default Home;