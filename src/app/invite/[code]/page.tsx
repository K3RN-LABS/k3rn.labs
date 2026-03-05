import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function InvitePage({ params }: { params: { code: string } }) {
    const code = params.code

    if (code) {
        // Enregistrer le code d'invitation dans les cookies pour l'utiliser lors de l'inscription
        // Expire dans 30 jours
        cookies().set('referral_code', code, { maxAge: 60 * 60 * 24 * 30, path: '/' })

        // Rediriger vers la page d'accueil avec un paramètre pour afficher un toast de bienvenue
        redirect(`/?ref=${code}`)
    }

    return redirect('/')
}
