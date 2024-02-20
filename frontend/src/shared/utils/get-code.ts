export default function getScriptCode(id: string) {
    const host = process.env.NODE_ENV === 'production' ? 'https://gl.toolstack.run' : 'http://localhost:3000'
    return `<script src="http://localhost:3000/script.js" defer></script>
<script>
    document.addEventListener("DOMContentLoaded", function () {
        if (typeof window.golingo != "undefined") {
            golingo.init({ code: '${id}' })
        }
    })
</script>`
}