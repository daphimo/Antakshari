document.addEventListener("DOMContentLoaded", () => {

    document.addEventListener("click", async (e) => {

        const addBtn = e.target.closest(".prop-add-btn");

        if (addBtn) {

            const card = addBtn.closest(".prop-card");
            const wrap = card.querySelector(".prop-add-wrap");
            const qty = card.querySelector(".prop-qty");

            const variantId = card.dataset.addItemId;

            await fetch("/cart/add.js",{
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    id:variantId,
                    quantity:1
                })
            });

            wrap.classList.add("is-added");
            qty.textContent = 1;

            return;
        }

        const qtyBtn = e.target.closest(".prop-qty-btn");

        if(!qtyBtn) return;

        const card = qtyBtn.closest(".prop-card");

        const variantId = card.dataset.addItemId;

        const qtyElement = card.querySelector(".prop-qty");

        let qty = parseInt(qtyElement.textContent);

        if(qtyBtn.dataset.action === "plus"){
            qty++;
        }else{
            if(qty <= 1) return;
            qty--;
        }

        qtyElement.textContent = qty;

        const cart = await fetch("/cart.js").then(r=>r.json());

        const lineItem = cart.items.find(item => item.variant_id == variantId);

        if(!lineItem) return;

        await fetch("/cart/change.js",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                id:lineItem.key,
                quantity:qty
            })
        });

    });

});