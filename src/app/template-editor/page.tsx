
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Eye } from 'lucide-react';

export default function TemplateEditorPage() {
    const [companyName, setCompanyName] = useState('Invoice Flow Inc.');
    const [footerText, setFooterText] = useState('<p>Thank you for your business! Please make payment within 30 days.</p><p><b>Bank Details:</b><br/>Bank: Example Bank<br/>Account: 1234567890</p>');
    const [logoPreview, setLogoPreview] = useState<string | null>('https://placehold.co/100x100.png');
    const [rawHtmlMode, setRawHtmlMode] = useState(true);

    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveChanges = () => {
        // In a real application, you would save these settings to a backend or localStorage.
        console.log('Saving changes:', { companyName, footerText, logo: logoPreview });
        // For demonstration, we'll just log it.
        alert('Changes saved successfully! (Check console for details)');
    };

    const mockInvoice = {
        number: 'INV-2024-001',
        date: new Date().toLocaleDateString(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString(),
        customer: {
            name: 'John Doe',
            address: '123 Main Street, Anytown, USA',
            email: 'john.doe@example.com'
        },
        items: [
            { description: 'Web Development Services', quantity: 10, price: 150.00 },
            { description: 'UI/UX Design Mockups', quantity: 1, price: 1200.00 },
            { description: 'Logo Design', quantity: 1, price: 500.00 },
        ]
    };

    const subtotal = mockInvoice.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const tax = subtotal * 0.1; // 10% tax for example
    const total = subtotal + tax;
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    return (
        <div className="grid lg:grid-cols-2 gap-8 w-full max-w-7xl mx-auto">
            {/* Editor Card */}
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Edit Invoice Template</CardTitle>
                    <CardDescription>Customize the look and feel of your invoices.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="company-name">Company Name</Label>
                        <Input
                            id="company-name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Your Company Name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="logo-upload">Company Logo</Label>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted">
                               {logoPreview ? (
                                    <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" data-ai-hint="logo" />
                               ) : (
                                    <span className="text-xs text-muted-foreground">No Logo</span>
                               )}
                            </div>
                            <Button asChild variant="outline">
                                <label htmlFor="logo-upload" className="cursor-pointer">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Logo
                                    <Input id="logo-upload" type="file" className="sr-only" accept="image/*" onChange={handleLogoChange} />
                                </label>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="footer-text">Footer Content</Label>
                            <Button variant="ghost" size="sm" onClick={() => setRawHtmlMode(!rawHtmlMode)}>
                                <Eye className="mr-2 h-4 w-4" />
                                {rawHtmlMode ? 'Preview HTML' : 'Edit HTML'}
                            </Button>
                        </div>
                         {rawHtmlMode ? (
                            <Textarea
                                id="footer-text"
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                                placeholder="e.g., <p>Thank you for your business!</p>"
                                rows={6}
                                className="font-mono text-xs"
                            />
                        ) : (
                            <div
                                className="p-4 border rounded-md min-h-[120px] bg-muted/50 text-sm"
                                dangerouslySetInnerHTML={{ __html: footerText }}
                            />
                        )}

                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                </CardFooter>
            </Card>

            {/* Preview Card */}
            <div className="lg:col-span-1">
                <h3 className="text-lg font-semibold mb-4 text-center">Invoice Preview</h3>
                <Card className="shadow-lg w-full printable-area">
                    <CardContent className="p-8">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-primary">{companyName}</h1>
                                <p className="text-muted-foreground">123 Innovation Drive</p>
                                <p className="text-muted-foreground">Tech City, CA 94043</p>
                            </div>
                            <div className="w-24 h-24 flex items-center justify-center">
                                {logoPreview && <img src={logoPreview} alt="Company Logo" className="max-w-full max-h-full object-contain" data-ai-hint="logo"/>}
                            </div>
                        </div>

                        {/* Invoice Info */}
                        <div className="flex justify-between mb-8 text-sm">
                            <div className="space-y-1">
                                <p className="font-bold text-primary">Bill To:</p>
                                <p>{mockInvoice.customer.name}</p>
                                <p className="text-muted-foreground">{mockInvoice.customer.address}</p>
                                <p className="text-muted-foreground">{mockInvoice.customer.email}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p><span className="font-bold">Invoice #:</span> {mockInvoice.number}</p>
                                <p><span className="font-bold">Date:</span> {mockInvoice.date}</p>
                                <p><span className="font-bold">Due Date:</span> {mockInvoice.dueDate}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full text-sm mb-8">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2">Description</th>
                                    <th className="text-right py-2">Quantity</th>
                                    <th className="text-right py-2">Unit Price</th>
                                    <th className="text-right py-2">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockInvoice.items.map((item, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="py-2">{item.description}</td>
                                        <td className="text-right py-2">{item.quantity}</td>
                                        <td className="text-right py-2">{formatCurrency(item.price)}</td>
                                        <td className="text-right py-2">{formatCurrency(item.quantity * item.price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* Totals */}
                        <div className="flex justify-end mb-8">
                            <div className="w-64 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tax (10%):</span>
                                    <span>{formatCurrency(tax)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                                    <span>Total:</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Footer */}
                         <div className="text-xs text-muted-foreground pt-4 border-t" dangerouslySetInnerHTML={{ __html: footerText }} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
