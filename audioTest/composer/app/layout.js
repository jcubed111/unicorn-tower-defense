import './globals.css';

export const metadata = {
    title: 'Composer',
    description: 'Compose a short musical piece',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
