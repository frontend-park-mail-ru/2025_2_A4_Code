export class AuthService {
    async login(credentials: {email: string, password: string}) {
        const response = await fetch('/api/', {
           method: 'POST',
           headers: new Headers({'Content-Type': 'application/json'}),
           body: JSON.stringify(credentials)
        });

        return await response.json();
    }
}